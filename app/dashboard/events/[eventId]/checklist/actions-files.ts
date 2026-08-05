'use server'

import {
  getOrgAuth,
  assertEventOwnership,
  assertChecklistItemBelongsToEvent,
  assertEventFileBelongsToEvent,
} from '@/lib/supabase/actions'
import { put, del } from '@vercel/blob'
import { MAX_FILE_SIZE } from '@/schemas/file.schema'
import type { ChecklistItemFileLink, EventFileWithUploader } from '@/types/app'

export async function loadItemFilesAction(
  eventId: string,
  itemId: string
): Promise<ChecklistItemFileLink[]> {
  const auth = await getOrgAuth()
  if (!auth) return []
  const { supabase, member } = auth

  const { data } = await supabase
    .from('checklist_item_files')
    .select('*, file:event_files!event_file_id(*, uploader:team_members!uploaded_by(id, full_name, avatar_url))')
    .eq('checklist_item_id', itemId)
    .eq('organization_id', member.organization_id)
    .order('created_at', { ascending: false })
    .returns<ChecklistItemFileLink[]>()

  return data ?? []
}

export async function loadEventFilesForLinkingAction(eventId: string): Promise<EventFileWithUploader[]> {
  const auth = await getOrgAuth()
  if (!auth) return []
  const { supabase, member } = auth

  const { data } = await supabase
    .from('event_files')
    .select('*, uploader:team_members!uploaded_by(id, full_name, avatar_url)')
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)
    .order('created_at', { ascending: false })
    .returns<EventFileWithUploader[]>()

  return data ?? []
}

export async function linkFileToItemAction(
  eventId: string,
  itemId: string,
  eventFileId: string
): Promise<ChecklistItemFileLink | null> {
  const auth = await getOrgAuth()
  if (!auth) return null
  const { supabase, user, member } = auth

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return null

  const [itemBelongs, fileBelongs] = await Promise.all([
    assertChecklistItemBelongsToEvent(supabase, itemId, eventId),
    assertEventFileBelongsToEvent(supabase, eventFileId, eventId),
  ])
  if (!itemBelongs || !fileBelongs) return null

  const { data: linkedByRow } = await supabase
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const { data } = await supabase
    .from('checklist_item_files')
    .insert({
      checklist_item_id: itemId,
      event_file_id: eventFileId,
      organization_id: member.organization_id,
      linked_by: linkedByRow?.id ?? null,
    })
    .select('*, file:event_files!event_file_id(*, uploader:team_members!uploaded_by(id, full_name, avatar_url))')
    .returns<ChecklistItemFileLink[]>()
    .single()

  return data ?? null
}

export async function unlinkFileFromItemAction(
  eventId: string,
  itemId: string,
  linkId: string
): Promise<boolean> {
  const auth = await getOrgAuth()
  if (!auth) return false
  const { supabase, member } = auth

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return false

  const { error, count } = await supabase
    .from('checklist_item_files')
    .delete({ count: 'exact' })
    .eq('id', linkId)
    .eq('checklist_item_id', itemId)
    .eq('organization_id', member.organization_id)

  return !error && (count ?? 0) > 0
}

export async function uploadFileToItemAction(
  eventId: string,
  itemId: string,
  formData: FormData
): Promise<ChecklistItemFileLink | null> {
  const auth = await getOrgAuth()
  if (!auth) return null
  const { supabase, user, member } = auth

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return null

  const itemBelongs = await assertChecklistItemBelongsToEvent(supabase, itemId, eventId)
  if (!itemBelongs) return null

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return null
  if (file.size > MAX_FILE_SIZE) return null

  const { ALLOWED_MIME_TYPES, detectMimeFromMagic, isMimeMismatch, safeBlobPathname } = await import('@/schemas/file.schema')
  const declaredMime = file.type || ''
  if (!ALLOWED_MIME_TYPES.has(declaredMime)) return null
  const detectedMime = await detectMimeFromMagic(file)
  if (isMimeMismatch(declaredMime, detectedMime)) return null

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN
  if (!blobToken) return null

  const blob = await put(safeBlobPathname(file.name), file, {
    access: 'public',
    token: blobToken,
  })

  const { data: memberRow } = await supabase
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const { data: eventFile } = await supabase
    .from('event_files')
    .insert({
      event_id: eventId,
      organization_id: member.organization_id,
      uploaded_by: memberRow?.id ?? null,
      file_name: file.name.slice(0, 255),
      file_size: file.size,
      mime_type: declaredMime,
      blob_url: blob.url,
      blob_pathname: blob.pathname,
    })
    .select('id')
    .single()

  if (!eventFile) {
    try { await del(blob.url, { token: blobToken }) } catch { /* best effort */ }
    return null
  }

  const { data } = await supabase
    .from('checklist_item_files')
    .insert({
      checklist_item_id: itemId,
      event_file_id: eventFile.id,
      organization_id: member.organization_id,
      linked_by: memberRow?.id ?? null,
    })
    .select('*, file:event_files!event_file_id(*, uploader:team_members!uploaded_by(id, full_name, avatar_url))')
    .returns<ChecklistItemFileLink[]>()
    .single()

  if (!data) {
    await supabase.from('event_files').delete().eq('id', eventFile.id)
    try { await del(blob.url, { token: blobToken }) } catch { /* best effort */ }
    return null
  }

  return data ?? null
}
