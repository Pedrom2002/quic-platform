'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'
import { put } from '@vercel/blob'

import { requireOrgAuth } from '@/lib/supabase/actions'
import { agendaItemSchema, clippingSchema, assetSchema } from '@/lib/artists/validation'
import { notifyArtistOfNewItem } from '@/lib/artists/notify'
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  detectMimeFromMagic,
  isMimeMismatch,
  safeBlobPathname,
} from '@/schemas/file.schema'
import { getEnv } from '@/lib/env'

export type ActionResult = { error?: string }

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

async function getOrgClient() {
  try {
    const { supabase, member } = await requireOrgAuth()
    return { supabase, member }
  } catch {
    return null
  }
}

function issuesToMessage(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join('; ')
}

function optionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key)
  return value ? String(value) : null
}

type OrgClient = NonNullable<Awaited<ReturnType<typeof getOrgClient>>>

// O client anon (RLS) só devolve artistas da própria org: serve de verificação
// de ownership antes de inserir itens com este artist_id.
async function getOwnedArtist(auth: OrgClient, artistId: string) {
  const { data } = await auth.supabase
    .from('artists')
    .select('id, name, email, portal_token, notify_on_publish')
    .eq('id', artistId)
    .single()
  return data
}

type OwnedArtist = NonNullable<Awaited<ReturnType<typeof getOwnedArtist>>>

async function maybeNotify(formData: FormData, artist: OwnedArtist, itemLabel: string) {
  if (formData.get('notify') !== 'on') return
  await notifyArtistOfNewItem({ artist, itemLabel })
}

function revalidateArtist(artistId: string, tab: string) {
  revalidatePath(`/dashboard/artists/${artistId}/${tab}`)
  revalidatePath('/dashboard/artists')
}

async function uploadValidatedFile(
  file: File,
  allowed: Set<string>
): Promise<{ url?: string; error?: string }> {
  if (file.size === 0) return { error: 'Ficheiro vazio' }
  if (file.size > MAX_FILE_SIZE) return { error: 'Ficheiro demasiado grande (máx. 50 MB)' }
  if (!allowed.has(file.type)) return { error: 'Tipo de ficheiro não suportado' }

  const detected = await detectMimeFromMagic(file)
  if (isMimeMismatch(file.type, detected)) {
    return { error: 'O conteúdo do ficheiro não corresponde ao tipo declarado' }
  }

  const token = getEnv().BLOB_READ_WRITE_TOKEN
  if (!token) return { error: 'Upload de ficheiros não configurado' }

  const blob = await put(safeBlobPathname(file.name), file, { access: 'public', token })
  return { url: blob.url }
}

// ---------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------

function parseAgendaForm(formData: FormData) {
  return agendaItemSchema.safeParse({
    type: formData.get('type'),
    title: formData.get('title'),
    starts_at: formData.get('starts_at'),
    ends_at: optionalText(formData, 'ends_at'),
    location: optionalText(formData, 'location'),
    notes: optionalText(formData, 'notes'),
    event_id: optionalText(formData, 'event_id'),
    is_visible: formData.get('is_visible') === 'on',
  })
}

export async function createAgendaItem(formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const artistId = z.uuid().safeParse(formData.get('artist_id'))
  if (!artistId.success) return { error: 'Artista inválido' }

  const artist = await getOwnedArtist(auth, artistId.data)
  if (!artist) return { error: 'Artista inválido' }

  const parsed = parseAgendaForm(formData)
  if (!parsed.success) return { error: issuesToMessage(parsed.error) }

  const { error } = await auth.supabase.from('artist_agenda_items').insert({
    ...parsed.data,
    artist_id: artist.id,
    organization_id: auth.member.organization_id,
  })
  if (error) return { error: 'Erro ao criar o item da agenda' }

  await maybeNotify(formData, artist, `novo item na agenda: ${parsed.data.title}`)
  revalidateArtist(artist.id, 'agenda')
  return {}
}

export async function updateAgendaItem(formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Item inválido' }

  const parsed = parseAgendaForm(formData)
  if (!parsed.success) return { error: issuesToMessage(parsed.error) }

  const { error } = await auth.supabase
    .from('artist_agenda_items')
    .update(parsed.data)
    .eq('id', id.data)
  if (error) return { error: 'Erro ao atualizar o item' }

  const artistId = optionalText(formData, 'artist_id')
  if (artistId) revalidateArtist(artistId, 'agenda')
  return {}
}

export async function toggleAgendaVisibility(formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Item inválido' }

  const isVisible = formData.get('is_visible') === 'true'

  const { error } = await auth.supabase
    .from('artist_agenda_items')
    .update({ is_visible: isVisible })
    .eq('id', id.data)
  if (error) return { error: 'Erro ao atualizar a visibilidade' }

  const artistId = optionalText(formData, 'artist_id')
  if (artistId) revalidateArtist(artistId, 'agenda')
  return {}
}

export async function deleteAgendaItem(formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Item inválido' }

  const { error } = await auth.supabase.from('artist_agenda_items').delete().eq('id', id.data)
  if (error) return { error: 'Erro ao apagar o item' }

  const artistId = optionalText(formData, 'artist_id')
  if (artistId) revalidateArtist(artistId, 'agenda')
  return {}
}

// ---------------------------------------------------------------------------
// Clipping
// ---------------------------------------------------------------------------

function parseClippingForm(formData: FormData, imageUrl: string | null) {
  return clippingSchema.safeParse({
    title: formData.get('title'),
    source: optionalText(formData, 'source'),
    url: formData.get('url'),
    image_url: imageUrl,
    published_at: optionalText(formData, 'published_at'),
  })
}

async function resolveClippingImage(
  formData: FormData
): Promise<{ url: string | null; error?: string }> {
  const image = formData.get('image')
  if (!(image instanceof File) || image.size === 0) return { url: null }
  const uploaded = await uploadValidatedFile(image, IMAGE_MIME_TYPES)
  if (uploaded.error) return { url: null, error: uploaded.error }
  return { url: uploaded.url ?? null }
}

export async function createClipping(formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const artistId = z.uuid().safeParse(formData.get('artist_id'))
  if (!artistId.success) return { error: 'Artista inválido' }

  const artist = await getOwnedArtist(auth, artistId.data)
  if (!artist) return { error: 'Artista inválido' }

  const image = await resolveClippingImage(formData)
  if (image.error) return { error: image.error }

  const parsed = parseClippingForm(formData, image.url)
  if (!parsed.success) return { error: issuesToMessage(parsed.error) }

  const { error } = await auth.supabase.from('artist_clippings').insert({
    ...parsed.data,
    artist_id: artist.id,
    organization_id: auth.member.organization_id,
  })
  if (error) return { error: 'Erro ao criar o clipping' }

  await maybeNotify(formData, artist, `novo artigo de imprensa: ${parsed.data.title}`)
  revalidateArtist(artist.id, 'clipping')
  return {}
}

export async function updateClipping(formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Clipping inválido' }

  const image = await resolveClippingImage(formData)
  if (image.error) return { error: image.error }

  const existingImage = optionalText(formData, 'existing_image_url')
  const parsed = parseClippingForm(formData, image.url ?? existingImage)
  if (!parsed.success) return { error: issuesToMessage(parsed.error) }

  const { error } = await auth.supabase
    .from('artist_clippings')
    .update(parsed.data)
    .eq('id', id.data)
  if (error) return { error: 'Erro ao atualizar o clipping' }

  const artistId = optionalText(formData, 'artist_id')
  if (artistId) revalidateArtist(artistId, 'clipping')
  return {}
}

export async function deleteClipping(formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Clipping inválido' }

  const { error } = await auth.supabase.from('artist_clippings').delete().eq('id', id.data)
  if (error) return { error: 'Erro ao apagar o clipping' }

  const artistId = optionalText(formData, 'artist_id')
  if (artistId) revalidateArtist(artistId, 'clipping')
  return {}
}

// ---------------------------------------------------------------------------
// Assets (conteúdos digitais + documentos)
// ---------------------------------------------------------------------------

export async function createAsset(formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const artistId = z.uuid().safeParse(formData.get('artist_id'))
  if (!artistId.success) return { error: 'Artista inválido' }

  const artist = await getOwnedArtist(auth, artistId.data)
  if (!artist) return { error: 'Artista inválido' }

  const externalUrl = optionalText(formData, 'external_url')
  let blobUrl: string | null = null
  let thumbnailUrl: string | null = null

  const file = formData.get('file')
  if (file instanceof File && file.size > 0) {
    if (externalUrl) return { error: 'Indica um ficheiro ou um link externo, não ambos' }
    const uploaded = await uploadValidatedFile(file, ALLOWED_MIME_TYPES)
    if (uploaded.error) return { error: uploaded.error }
    blobUrl = uploaded.url ?? null
    if (IMAGE_MIME_TYPES.has(file.type)) thumbnailUrl = blobUrl
  }

  const parsed = assetSchema.safeParse({
    section: formData.get('section'),
    kind: formData.get('kind'),
    title: formData.get('title'),
    blob_url: blobUrl,
    external_url: externalUrl,
    thumbnail_url: thumbnailUrl,
    notes: optionalText(formData, 'notes'),
  })
  if (!parsed.success) return { error: issuesToMessage(parsed.error) }

  const { error } = await auth.supabase.from('artist_assets').insert({
    ...parsed.data,
    artist_id: artist.id,
    organization_id: auth.member.organization_id,
  })
  if (error) return { error: 'Erro ao guardar' }

  const label =
    parsed.data.section === 'content'
      ? `novo conteúdo: ${parsed.data.title}`
      : `novo documento: ${parsed.data.title}`
  await maybeNotify(formData, artist, label)

  revalidateArtist(artist.id, parsed.data.section === 'content' ? 'conteudos' : 'documentos')
  return {}
}

export async function deleteAsset(formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Item inválido' }

  const { error } = await auth.supabase.from('artist_assets').delete().eq('id', id.data)
  if (error) return { error: 'Erro ao apagar' }

  const artistId = optionalText(formData, 'artist_id')
  const section = formData.get('section') === 'document' ? 'documentos' : 'conteudos'
  if (artistId) revalidateArtist(artistId, section)
  return {}
}
