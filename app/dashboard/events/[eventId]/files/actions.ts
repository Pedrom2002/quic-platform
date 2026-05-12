'use server'

import { put, del } from '@vercel/blob'
import { createClient } from '@/lib/supabase/server'
import {
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  detectMimeFromMagic,
  isMimeMismatch,
  safeBlobPathname,
} from '@/schemas/file.schema'
import { getEnv } from '@/lib/env'
import { audit } from '@/lib/audit'
import type { EventFileWithUploader } from '@/types/app'

function getBlobToken(): string {
  return getEnv().BLOB_READ_WRITE_TOKEN
}

export async function uploadFileAction(eventId: string, formData: FormData): Promise<EventFileWithUploader | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await supabase
    .from('team_members')
    .select('id, organization_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!member) return null

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!event) return null

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return null
  if (file.size > MAX_FILE_SIZE) return null

  // Validate MIME type against server-side allowlist
  const declaredMime = file.type || ''
  if (!ALLOWED_MIME_TYPES.has(declaredMime)) return null

  // Validate magic bytes — catches files with spoofed Content-Type
  const detectedMime = await detectMimeFromMagic(file)
  if (isMimeMismatch(declaredMime, detectedMime)) return null

  // Use UUID-prefixed pathname to prevent enumeration and path traversal
  const blobPathname = safeBlobPathname(file.name)

  const blob = await put(blobPathname, file, {
    access: 'public',
    token: getBlobToken(),
  })

  const { data } = await supabase
    .from('event_files')
    .insert({
      event_id: eventId,
      organization_id: member.organization_id,
      uploaded_by: member.id,
      file_name: file.name.slice(0, 255),
      file_size: file.size,
      mime_type: declaredMime,
      blob_url: blob.url,
      blob_pathname: blob.pathname,
    })
    .select('*, uploader:team_members!uploaded_by(id, full_name, avatar_url)')
    .returns<EventFileWithUploader[]>()
    .single()

  if (data) {
    audit({
      action: 'file.uploaded',
      userId: user.id,
      organizationId: member.organization_id,
      eventId,
      meta: { fileId: data.id, fileName: file.name.slice(0, 255), mimeType: declaredMime, fileSize: file.size },
    })
  }

  return data ?? null
}

export async function deleteFileAction(eventId: string, fileId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: member } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!member) return false

  const { data: fileRecord } = await supabase
    .from('event_files')
    .select('blob_url')
    .eq('id', fileId)
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!fileRecord) return false

  await del(fileRecord.blob_url, { token: getBlobToken() })

  const { error, count } = await supabase
    .from('event_files')
    .delete({ count: 'exact' })
    .eq('id', fileId)
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)

  const deleted = !error && (count ?? 0) > 0
  if (deleted) {
    audit({
      action: 'file.deleted',
      userId: user.id,
      organizationId: member.organization_id,
      eventId,
      meta: { fileId },
    })
  }
  return deleted
}
