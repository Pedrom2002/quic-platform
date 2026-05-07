'use server'

import { createClient } from '@/lib/supabase/server'
import { resolveOrgMember } from '@/lib/supabase/actions'
import { put } from '@vercel/blob'
import { MAX_FILE_SIZE } from '@/schemas/file.schema'
import type { ChecklistItemStatus, EventTask, EventTaskNote, EventTaskFileLink, EventFileWithUploader } from '@/types/app'

async function assertEventOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  organizationId: string
) {
  const { data } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('organization_id', organizationId)
    .single()
  return !!data
}

export async function loadEventTasksAction(eventId: string): Promise<EventTask[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return []

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return null

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return null

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
      title: fields.title.trim(),
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return null

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return null

  const updateData: Record<string, unknown> = { ...fields }
  if (fields.status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  } else if (fields.status !== undefined) {
    updateData.completed_at = null
  }

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return false

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return false

  const updates = orderedIds.map((id, index) =>
    supabase
      .from('event_tasks')
      .update({ position: index })
      .eq('id', id)
      .eq('event_id', eventId)
      .eq('organization_id', member.organization_id)
  )

  const results = await Promise.all(updates)
  return results.every(r => !r.error)
}

export async function addTaskNoteAction(
  eventId: string,
  taskId: string,
  content: string
): Promise<EventTaskNote | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return null

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return false

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return []

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return []

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return null

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return false

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return null

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return null

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return null
  if (file.size > MAX_FILE_SIZE) return null

  const blob = await put(file.name, file, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
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
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return []

  const { data } = await supabase
    .from('event_checklist_items')
    .select('id, title, client_label, status')
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)
    .order('position', { ascending: true })

  return data ?? []
}
