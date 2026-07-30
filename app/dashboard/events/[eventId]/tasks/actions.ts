'use server'

import { getOrgAuth, assertEventOwnership } from '@/lib/supabase/actions'
import { put } from '@vercel/blob'
import { MAX_FILE_SIZE } from '@/schemas/file.schema'
import type { ChecklistItemStatus, EventTask, EventTaskNote, EventTaskFileLink, EventFileWithUploader } from '@/types/app'
import type { TablesUpdate } from '@/types/database'

export async function loadEventTasksAction(eventId: string): Promise<EventTask[]> {
  const auth = await getOrgAuth()
  if (!auth) return []
  const { supabase, member } = auth

  const { data } = await supabase
    .from('event_tasks')
    .select('*, assigned_member:team_members!assigned_to(id, full_name, avatar_url)')
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)
    .order('position', { ascending: true })
    .returns<EventTask[]>()

  return data ?? []
}

export async function createTaskAction(
  eventId: string,
  fields: { title: string; parentId?: string | null; checklistItemId?: string | null }
): Promise<EventTask | null> {
  const auth = await getOrgAuth()
  if (!auth) return null
  const { supabase, member } = auth

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return null

  const trimmedTitle = fields.title.trim()
  if (!trimmedTitle || trimmedTitle.length > 300) return null

  const parentId = fields.parentId ?? null

  const query = supabase
    .from('event_tasks')
    .select('position')
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)
    .order('position', { ascending: false })
    .limit(1)

  const { data: siblings } = parentId
    ? await query.eq('parent_id', parentId)
    : await query.is('parent_id', null)

  const position = siblings && siblings.length > 0 ? siblings[0].position + 1 : 0

  const { data } = await supabase
    .from('event_tasks')
    .insert({
      event_id: eventId,
      organization_id: member.organization_id,
      parent_id: parentId,
      checklist_item_id: fields.checklistItemId ?? null,
      title: trimmedTitle,
      position,
    })
    .select('*, assigned_member:team_members!assigned_to(id, full_name, avatar_url)')
    .returns<EventTask[]>()
    .single()

  return data ?? null
}

export async function updateTaskAction(
  eventId: string,
  taskId: string,
  fields: {
    title?: string
    description?: string | null
    status?: ChecklistItemStatus
    assigned_to?: string | null
    due_at?: string | null
    checklist_item_id?: string | null
  }
): Promise<EventTask | null> {
  const auth = await getOrgAuth()
  if (!auth) return null
  const { supabase, member } = auth

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return null

  if (fields.title !== undefined && (fields.title.trim().length === 0 || fields.title.length > 300)) return null
  if (fields.description !== undefined && fields.description !== null && fields.description.length > 2000) return null

  const updateData: TablesUpdate<'event_tasks'> = { ...fields }

  const { data } = await supabase
    .from('event_tasks')
    .update(updateData)
    .eq('id', taskId)
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)
    .select('*, assigned_member:team_members!assigned_to(id, full_name, avatar_url)')
    .returns<EventTask[]>()
    .single()

  return data ?? null
}

export async function deleteTaskAction(eventId: string, taskId: string): Promise<boolean> {
  const auth = await getOrgAuth()
  if (!auth) return false
  const { supabase, member } = auth

  const { error, count } = await supabase
    .from('event_tasks')
    .delete({ count: 'exact' })
    .eq('id', taskId)
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)

  return !error && (count ?? 0) > 0
}

export async function reorderTasksAction(
  eventId: string,
  parentId: string | null,
  orderedIds: string[]
): Promise<boolean> {
  const auth = await getOrgAuth()
  if (!auth) return false
  const { supabase, member } = auth

  // Validate ownership: only reorder tasks that actually belong to this event + org.
  const query = supabase
    .from('event_tasks')
    .select('id')
    .in('id', orderedIds)
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)

  const { data: validRows } = parentId
    ? await query.eq('parent_id', parentId)
    : await query.is('parent_id', null)

  const validIds = new Set((validRows ?? []).map(r => r.id))
  const rows = orderedIds
    .filter(id => validIds.has(id))
    .map((id, index) => ({ id, position: index }))

  if (!rows.length) return true

  // update por linha em vez de upsert: os ids ja foram validados acima
  // como pertencentes a este evento, isto nunca insere, so reordena.
  const results = await Promise.all(
    rows.map(row => supabase.from('event_tasks').update({ position: row.position }).eq('id', row.id))
  )

  return results.every(r => !r.error)
}

export async function addTaskNoteAction(
  eventId: string,
  taskId: string,
  content: string
): Promise<EventTaskNote | null> {
  const auth = await getOrgAuth()
  if (!auth) return null
  const { supabase, user, member } = auth

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return null

  if (!content.trim() || content.length > 10000) return null

  const { data: authorRow } = await supabase
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const { data } = await supabase
    .from('event_task_notes')
    .insert({
      task_id: taskId,
      event_id: eventId,
      organization_id: member.organization_id,
      author_id: authorRow?.id ?? null,
      content: content.trim(),
    })
    .select('*, author:team_members!author_id(id, full_name, avatar_url)')
    .returns<EventTaskNote[]>()
    .single()

  return data ?? null
}

export async function deleteTaskNoteAction(
  eventId: string,
  taskId: string,
  noteId: string
): Promise<boolean> {
  const auth = await getOrgAuth()
  if (!auth) return false
  const { supabase, member } = auth

  const { error, count } = await supabase
    .from('event_task_notes')
    .delete({ count: 'exact' })
    .eq('id', noteId)
    .eq('task_id', taskId)
    .eq('organization_id', member.organization_id)

  return !error && (count ?? 0) > 0
}

export async function loadTaskNotesAction(
  eventId: string,
  taskId: string
): Promise<EventTaskNote[]> {
  const auth = await getOrgAuth()
  if (!auth) return []
  const { supabase, member } = auth

  const { data } = await supabase
    .from('event_task_notes')
    .select('*, author:team_members!author_id(id, full_name, avatar_url)')
    .eq('task_id', taskId)
    .eq('organization_id', member.organization_id)
    .order('created_at', { ascending: false })
    .returns<EventTaskNote[]>()

  return data ?? []
}

export async function loadTaskFilesAction(
  eventId: string,
  taskId: string
): Promise<EventTaskFileLink[]> {
  const auth = await getOrgAuth()
  if (!auth) return []
  const { supabase, member } = auth

  const { data } = await supabase
    .from('event_task_files')
    .select('*, file:event_files!event_file_id(*, uploader:team_members!uploaded_by(id, full_name, avatar_url))')
    .eq('task_id', taskId)
    .eq('organization_id', member.organization_id)
    .order('created_at', { ascending: false })
    .returns<EventTaskFileLink[]>()

  return data ?? []
}

export async function linkFileToTaskAction(
  eventId: string,
  taskId: string,
  eventFileId: string
): Promise<EventTaskFileLink | null> {
  const auth = await getOrgAuth()
  if (!auth) return null
  const { supabase, user, member } = auth

  const { data: linkedByRow } = await supabase
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const { data } = await supabase
    .from('event_task_files')
    .insert({
      task_id: taskId,
      event_file_id: eventFileId,
      organization_id: member.organization_id,
      linked_by: linkedByRow?.id ?? null,
    })
    .select('*, file:event_files!event_file_id(*, uploader:team_members!uploaded_by(id, full_name, avatar_url))')
    .returns<EventTaskFileLink[]>()
    .single()

  return data ?? null
}

export async function unlinkFileFromTaskAction(
  eventId: string,
  taskId: string,
  linkId: string
): Promise<boolean> {
  const auth = await getOrgAuth()
  if (!auth) return false
  const { supabase, member } = auth

  const { error, count } = await supabase
    .from('event_task_files')
    .delete({ count: 'exact' })
    .eq('id', linkId)
    .eq('task_id', taskId)
    .eq('organization_id', member.organization_id)

  return !error && (count ?? 0) > 0
}

export async function uploadFileToTaskAction(
  eventId: string,
  taskId: string,
  formData: FormData
): Promise<EventTaskFileLink | null> {
  const auth = await getOrgAuth()
  if (!auth) return null
  const { supabase, user, member } = auth

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return null

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

  if (!eventFile) return null

  const { data } = await supabase
    .from('event_task_files')
    .insert({
      task_id: taskId,
      event_file_id: eventFile.id,
      organization_id: member.organization_id,
      linked_by: memberRow?.id ?? null,
    })
    .select('*, file:event_files!event_file_id(*, uploader:team_members!uploaded_by(id, full_name, avatar_url))')
    .returns<EventTaskFileLink[]>()
    .single()

  return data ?? null
}

export async function loadChecklistItemsForLinkingAction(eventId: string) {
  const auth = await getOrgAuth()
  if (!auth) return []
  const { supabase, member } = auth

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return []

  const { data } = await supabase
    .from('event_checklist_items')
    .select('id, title, client_label, status')
    .eq('event_id', eventId)
    .order('position', { ascending: true })

  return data ?? []
}
