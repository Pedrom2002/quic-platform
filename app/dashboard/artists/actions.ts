'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'
import { put, del } from '@vercel/blob'

import { requireOrgAuth } from '@/lib/supabase/actions'
import { artistSchema } from '@/lib/artists/validation'
import { generatePortalToken } from '@/lib/portal/token'
import { detectMimeFromMagic, safeBlobPathname } from '@/schemas/file.schema'
import { getEnv } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'

export type ActionResult = { error?: string }

const MAX_PHOTO_SIZE = 5 * 1024 * 1024 // 5 MB
const PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

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

function parseArtistForm(formData: FormData) {
  return artistSchema.safeParse({
    name: formData.get('name'),
    email: optionalText(formData, 'email'),
    phone: optionalText(formData, 'phone'),
    bio: optionalText(formData, 'bio'),
    notify_on_publish: formData.get('notify_on_publish') === 'on',
  })
}

export async function createArtist(formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const parsed = parseArtistForm(formData)
  if (!parsed.success) return { error: issuesToMessage(parsed.error) }

  const { error } = await auth.supabase.from('artists').insert({
    ...parsed.data,
    organization_id: auth.member.organization_id,
    portal_token: generatePortalToken(),
  })
  if (error) return { error: 'Erro ao criar artista' }

  revalidatePath('/dashboard/artists')
  return {}
}

export async function updateArtist(formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Artista inválido' }

  const parsed = parseArtistForm(formData)
  if (!parsed.success) return { error: issuesToMessage(parsed.error) }

  const { error } = await auth.supabase.from('artists').update(parsed.data).eq('id', id.data).eq('organization_id', auth.member.organization_id)
  if (error) return { error: 'Erro ao atualizar artista' }

  revalidatePath('/dashboard/artists')
  revalidatePath(`/dashboard/artists/${id.data}`)
  return {}
}

export async function inviteArtistToApp(formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }
  if (auth.member.role !== 'admin') return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Artista inválido' }

  const { data: artist, error: fetchError } = await auth.supabase
    .from('artists')
    .select('id, email, auth_user_id')
    .eq('id', id.data)
    .eq('organization_id', auth.member.organization_id)
    .single()
  if (fetchError || !artist) return { error: 'Artista inválido' }
  if (!artist.email) return { error: 'Artista sem email definido' }
  if (artist.auth_user_id) return { error: 'Artista já convidado' }

  const admin = createAdminClient()
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(artist.email)
  if (inviteError || !invited?.user) return { error: 'Erro ao enviar convite' }

  const { error: updateError } = await auth.supabase
    .from('artists')
    .update({ auth_user_id: invited.user.id })
    .eq('id', id.data)
    .eq('organization_id', auth.member.organization_id)
  if (updateError) return { error: 'Convite enviado mas falhou ao ligar a conta' }

  revalidatePath(`/dashboard/artists/${id.data}`)
  return {}
}

export async function updateArtistPhoto(formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Artista inválido' }

  const photo = formData.get('photo')
  if (!(photo instanceof File) || photo.size === 0) {
    return { error: 'Seleciona uma imagem' }
  }
  if (photo.size > MAX_PHOTO_SIZE) {
    return { error: 'Imagem demasiado grande (máx. 5 MB)' }
  }

  // Deriva o tipo do conteúdo (magic bytes), nunca do que o cliente declara
  const detected = await detectMimeFromMagic(photo)
  if (!detected || !PHOTO_MIME_TYPES.has(detected)) {
    return { error: 'Formato de imagem não suportado (usa JPG, PNG, WebP ou GIF)' }
  }

  const token = getEnv().BLOB_READ_WRITE_TOKEN
  if (!token) return { error: 'Upload de ficheiros não configurado' }

  const { data: existing } = await auth.supabase
    .from('artists')
    .select('photo_url')
    .eq('id', id.data)
    .eq('organization_id', auth.member.organization_id)
    .single()

  const blob = await put(safeBlobPathname(photo.name), photo, { access: 'public', token })

  const { error } = await auth.supabase
    .from('artists')
    .update({ photo_url: blob.url })
    .eq('id', id.data)
    .eq('organization_id', auth.member.organization_id)
  if (error) {
    try { await del(blob.url, { token }) } catch { /* best effort */ }
    return { error: 'Erro ao guardar a foto' }
  }

  if (existing?.photo_url) {
    try { await del(existing.photo_url, { token }) } catch { /* best effort */ }
  }

  revalidatePath('/dashboard/artists')
  revalidatePath(`/dashboard/artists/${id.data}`)
  return {}
}

export async function toggleArtistActive(formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Artista inválido' }

  const isActive = formData.get('is_active') === 'true'

  const { error } = await auth.supabase
    .from('artists')
    .update({ is_active: isActive })
    .eq('id', id.data)
    .eq('organization_id', auth.member.organization_id)
  if (error) return { error: 'Erro ao atualizar o estado' }

  revalidatePath('/dashboard/artists')
  revalidatePath(`/dashboard/artists/${id.data}`)
  return {}
}

export async function regeneratePortalToken(formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Artista inválido' }

  const { error } = await auth.supabase
    .from('artists')
    .update({ portal_token: generatePortalToken(), portal_token_expires_at: null })
    .eq('id', id.data)
    .eq('organization_id', auth.member.organization_id)
  if (error) return { error: 'Erro ao regenerar o link' }

  revalidatePath(`/dashboard/artists/${id.data}`)
  return {}
}

export async function revokePortalToken(formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Artista inválido' }

  const { error } = await auth.supabase
    .from('artists')
    .update({ portal_token_expires_at: new Date().toISOString() })
    .eq('id', id.data)
    .eq('organization_id', auth.member.organization_id)
  if (error) return { error: 'Erro ao revogar o link' }

  revalidatePath(`/dashboard/artists/${id.data}`)
  return {}
}

export async function reactivatePortalToken(formData: FormData): Promise<ActionResult> {
  const auth = await getOrgClient()
  if (!auth) return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Artista inválido' }

  const { error } = await auth.supabase
    .from('artists')
    .update({ portal_token_expires_at: null })
    .eq('id', id.data)
    .eq('organization_id', auth.member.organization_id)
  if (error) return { error: 'Erro ao reativar o link' }

  revalidatePath(`/dashboard/artists/${id.data}`)
  return {}
}
