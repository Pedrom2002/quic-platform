'use server'

import { put, del } from '@vercel/blob'
import { createClient } from '@/lib/supabase/server'
import { MAX_FILE_SIZE } from '@/schemas/file.schema'
import type { EventFileWithUploader } from '@/types/app'

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

  const blob = await put(file.name, file, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })

  const { data } = await supabase
    .from('event_files')
    .insert({
      event_id: eventId,
      organization_id: member.organization_id,
      uploaded_by: member.id,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
      blob_url: blob.url,
      blob_pathname: blob.pathname,
    })
    .select('*, uploader:team_members!uploaded_by(id, full_name, avatar_url)')
    .returns<EventFileWithUploader[]>()
    .single()

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
    .select('blob_pathname')
    .eq('id', fileId)
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!fileRecord) return false

  // Delete from blob storage first; if it fails, DB row stays for retry
  await del(fileRecord.blob_pathname, { token: process.env.BLOB_READ_WRITE_TOKEN })

  const { error, count } = await supabase
    .from('event_files')
    .delete({ count: 'exact' })
    .eq('id', fileId)
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)

  return !error && (count ?? 0) > 0
}
