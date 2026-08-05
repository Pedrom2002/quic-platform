'use server'

import { getOrgAuth, assertEventOwnership, assertChecklistItemBelongsToEvent } from '@/lib/supabase/actions'
import type { ChecklistItemNote } from '@/types/app'

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

  const itemBelongs = await assertChecklistItemBelongsToEvent(supabase, itemId, eventId)
  if (!itemBelongs) return null

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

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return false

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
