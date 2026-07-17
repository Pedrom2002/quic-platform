'use server'

import * as z from 'zod'
import { put } from '@vercel/blob'

import { requireOrgAuth } from '@/lib/supabase/actions'
import { audit } from '@/lib/audit'
import { detectMimeFromMagic, safeBlobPathname } from '@/schemas/file.schema'
import { getEnv } from '@/lib/env'
import type { UpdateEventInput } from '@/schemas/event.schema'

export type ActionResult = { error?: string }

const MAX_PHOTO_SIZE = 5 * 1024 * 1024 // 5 MB
const PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function deleteEventAction(eventId: string): Promise<void> {
  const { supabase, user, member } = await requireOrgAuth()
  if (member.role !== 'admin') throw new Error('Apenas administradores podem eliminar eventos')

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)

  if (error) throw new Error(error.message)

  audit({
    action: 'event.deleted',
    userId: user.id,
    organizationId: member.organization_id,
    eventId,
    meta: {},
  })
}

export async function updateEventAction(eventId: string, data: UpdateEventInput): Promise<void> {
  const { supabase, user, member } = await requireOrgAuth()

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!event) throw new Error('Evento não encontrado')

  const normalise = (s?: string) => s ? new Date(s).toISOString() : undefined

  const { error } = await supabase
    .from('events')
    .update({
      ...data,
      ...(data.start_datetime && { start_datetime: normalise(data.start_datetime) }),
      ...(data.end_datetime && { end_datetime: normalise(data.end_datetime) }),
    })
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)

  if (error) throw new Error(error.message)

  if (data.status) {
    audit({
      action: 'event.status.changed',
      userId: user.id,
      organizationId: member.organization_id,
      eventId,
      meta: { newStatus: data.status },
    })
  }
}

export async function updatePortalVideosAction(
  eventId: string,
  heroVideo: string,
  contentVideo: string,
): Promise<void> {
  const { supabase, member } = await requireOrgAuth()

  const { data: event } = await supabase
    .from('events')
    .select('id, settings')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!event) throw new Error('Evento não encontrado')

  const currentSettings = (event.settings ?? {}) as Record<string, unknown>
  const newSettings = {
    ...currentSettings,
    portal_hero_video: heroVideo || null,
    portal_content_video: contentVideo || null,
  }

  const { error } = await supabase
    .from('events')
    .update({ settings: newSettings })
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)

  if (error) throw new Error(error.message)
}

export async function updateEventCoverPhoto(formData: FormData): Promise<ActionResult> {
  const auth = await (async () => {
    try {
      return await requireOrgAuth()
    } catch {
      return null
    }
  })()
  if (!auth) return { error: 'Sem permissões' }

  const id = z.uuid().safeParse(formData.get('id'))
  if (!id.success) return { error: 'Evento inválido' }

  const photo = formData.get('photo')
  if (!(photo instanceof File) || photo.size === 0) {
    return { error: 'Seleciona uma imagem' }
  }
  if (photo.size > MAX_PHOTO_SIZE) {
    return { error: 'Imagem demasiado grande (máx. 5 MB)' }
  }

  const detected = await detectMimeFromMagic(photo)
  if (!detected || !PHOTO_MIME_TYPES.has(detected)) {
    return { error: 'Formato de imagem não suportado (usa JPG, PNG, WebP ou GIF)' }
  }

  const token = getEnv().BLOB_READ_WRITE_TOKEN
  if (!token) return { error: 'Upload de ficheiros não configurado' }

  const blob = await put(safeBlobPathname(photo.name), photo, { access: 'public', token })

  const { error } = await auth.supabase
    .from('events')
    .update({ cover_image_url: blob.url })
    .eq('id', id.data)
    .eq('organization_id', auth.member.organization_id)
  if (error) return { error: 'Erro ao guardar a foto' }

  return {}
}
