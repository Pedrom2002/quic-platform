'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireOrgAuth, requireOrgAuthFull, getOrgAuth, getOrgAuthFull, assertEventOwnership } from '@/lib/supabase/actions'
import { put } from '@vercel/blob'
import { MAX_FILE_SIZE } from '@/schemas/file.schema'
import { dispatchNotificationsForItem, dispatchStartNotificationForItem } from '@/lib/notifications/dispatcher'
import type { ChecklistItemStatus, ChecklistItemNote, ChecklistItemFileLink, EventFileWithUploader } from '@/types/app'

export async function bulkUpdateChecklistStatusAction(
  eventId: string,
  ids: string[],
  status: ChecklistItemStatus
) {
  const { supabase, member } = await requireOrgAuthFull()

  if (!ids.length) throw new Error('Nenhum item selecionado')
  if (ids.length > 50) throw new Error('Máximo 50 items por operação')

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) throw new Error('Evento não encontrado')

  const updateData: Record<string, unknown> = { status }
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
    updateData.completed_by = member.id
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
    const adminClient = createAdminClient()
    const [{ data: event }, { data: completedItems }] = await Promise.all([
      adminClient.from('events').select('*').eq('id', eventId).single(),
      adminClient
        .from('event_checklist_items')
        .select('*')
        .in('id', ids)
        .eq('event_id', eventId),
    ])

    if (event && completedItems?.length) {
      const completedByName = member.full_name ?? 'Equipa QUIC'
      await Promise.allSettled(
        completedItems.map(item =>
          dispatchNotificationsForItem({ event, item, completedByName })
        )
      )
    }
  }

  if (status === 'in_progress') {
    const adminClient = createAdminClient()
    const [{ data: event }, { data: startedItems }] = await Promise.all([
      adminClient.from('events').select('*').eq('id', eventId).single(),
      adminClient
        .from('event_checklist_items')
        .select('*')
        .in('id', ids)
        .eq('event_id', eventId),
    ])

    if (event && startedItems?.length) {
      await Promise.allSettled(
        startedItems.map(item =>
          dispatchStartNotificationForItem({ event, item })
        )
      )
    }
  }
}

export async function loadOrgTeamMembersAction(eventId: string) {
  const auth = await getOrgAuth()
  if (!auth) return []
  const { supabase, member } = auth

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
  const { supabase, member } = await requireOrgAuth()

  if (!orderedIds.length) throw new Error('Nenhum item para reordenar')
  if (orderedIds.length > 200) throw new Error('Máximo 200 items por operação')

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) throw new Error('Evento não encontrado')

  // Validate that all IDs belong to this event before the bulk upsert.
  // Prevents cross-event position manipulation if client sends foreign IDs.
  const { data: validRows } = await supabase
    .from('event_checklist_items')
    .select('id')
    .in('id', orderedIds)
    .eq('event_id', eventId)

  const validIds = new Set((validRows ?? []).map(r => r.id))
  const rows = orderedIds
    .filter(id => validIds.has(id))
    .map((id, index) => ({ id, position: (index + 1) * 10 }))

  if (rows.length) {
    await supabase
      .from('event_checklist_items')
      .upsert(rows, { onConflict: 'id' })
  }
}

export async function updateChecklistItemAction(
  eventId: string,
  itemId: string,
  fields: {
    title?: string
    description?: string | null
    client_label?: string | null
    due_at?: string | null
    assigned_to?: string | null
    status?: ChecklistItemStatus
  }
) {
  const auth = await getOrgAuthFull()
  if (!auth) return null
  const { supabase, member } = auth

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

  if (fields.status === 'completed' && data) {
    const adminClient = createAdminClient()
    const { data: event } = await adminClient.from('events').select('*').eq('id', eventId).single()
    if (event) {
      dispatchNotificationsForItem({ event, item: data, completedByName: member.full_name ?? 'Equipa QUIC' }).catch(() => {})
    }
  }

  if (fields.status === 'in_progress' && data) {
    const adminClient = createAdminClient()
    const { data: event } = await adminClient.from('events').select('*').eq('id', eventId).single()
    if (event) {
      dispatchStartNotificationForItem({ event, item: data }).catch(() => {})
    }
  }

  return data
}

export async function addItemNoteAction(
  eventId: string,
  itemId: string,
  content: string
): Promise<ChecklistItemNote | null> {
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
  const auth = await getOrgAuth()
  if (!auth) return false
  const { supabase, member } = auth

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
  const auth = await getOrgAuth()
  if (!auth) return []
  const { supabase, member } = auth

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
