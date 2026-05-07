'use server'

import { createClient } from '@/lib/supabase/server'
import { resolveOrgMember } from '@/lib/supabase/actions'
import { put, del } from '@vercel/blob'
import { MAX_FILE_SIZE } from '@/schemas/file.schema'
import type { ChecklistItemStatus, ChecklistItemNote, ChecklistItemFileLink, EventFileWithUploader } from '@/types/app'

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

export async function bulkUpdateChecklistStatusAction(
  eventId: string,
  ids: string[],
  status: ChecklistItemStatus
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  if (!ids.length) throw new Error('Nenhum item selecionado')
  if (ids.length > 50) throw new Error('Máximo 50 items por operação')

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) throw new Error('Evento não encontrado')

  const updateData: Record<string, unknown> = { status }
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  } else {
    updateData.completed_at = null
  }

  const { error } = await supabase
    .from('event_checklist_items')
    .update(updateData)
    .in('id', ids)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)

  if (status === 'completed') {
    await Promise.allSettled(
      ids.map(id =>
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/events/${eventId}/checklist-items/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed', _notifyOnly: true }),
        })
      )
    )
  }
}

export async function loadOrgTeamMembersAction(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: member } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!member) return []

  const { data } = await supabase
    .from('team_members')
    .select('id, full_name')
    .eq('organization_id', member.organization_id)
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  return data ?? []
}

export async function reorderChecklistItemsAction(
  eventId: string,
  orderedIds: string[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  if (!orderedIds.length) throw new Error('Nenhum item para reordenar')
  if (orderedIds.length > 200) throw new Error('Máximo 200 items por operação')

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) throw new Error('Evento não encontrado')

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('event_checklist_items')
        .update({ position: (index + 1) * 10 })
        .eq('id', id)
        .eq('event_id', eventId)
    )
  )
}

export async function updateChecklistItemAction(
  eventId: string,
  itemId: string,
  fields: {
    title?: string
    description?: string | null
    due_at?: string | null
    assigned_to?: string | null
    status?: ChecklistItemStatus
  }
) {
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

  const { data, error } = await supabase
    .from('event_checklist_items')
    .update(updateData)
    .eq('id', itemId)
    .eq('event_id', eventId)
    .select('*, assigned_member:team_members!assigned_to(id, full_name, avatar_url)')
    .single()

  if (error) return null
  return data
}

export async function addItemNoteAction(
  eventId: string,
  itemId: string,
  content: string
): Promise<ChecklistItemNote | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return null

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return null

  if (!content.trim() || content.length > 10000) return null

  const { data: authorRow } = await supabase
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const { data } = await supabase
    .from('checklist_item_notes')
    .insert({
      checklist_item_id: itemId,
      event_id: eventId,
      organization_id: member.organization_id,
      author_id: authorRow?.id ?? null,
      content: content.trim(),
    })
    .select('*, author:team_members!author_id(id, full_name, avatar_url)')
    .returns<ChecklistItemNote[]>()
    .single()

  return data ?? null
}

export async function deleteItemNoteAction(
  eventId: string,
  itemId: string,
  noteId: string
): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return false

  const { error, count } = await supabase
    .from('checklist_item_notes')
    .delete({ count: 'exact' })
    .eq('id', noteId)
    .eq('checklist_item_id', itemId)
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)

  return !error && (count ?? 0) > 0
}

export async function loadItemNotesAction(
  eventId: string,
  itemId: string
): Promise<ChecklistItemNote[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return []

  const { data } = await supabase
    .from('checklist_item_notes')
    .select('*, author:team_members!author_id(id, full_name, avatar_url)')
    .eq('checklist_item_id', itemId)
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)
    .order('created_at', { ascending: false })
    .returns<ChecklistItemNote[]>()

  return data ?? []
}

export async function loadItemFilesAction(
  eventId: string,
  itemId: string
): Promise<ChecklistItemFileLink[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return []

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return []

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return false

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

  return data ?? null
}
