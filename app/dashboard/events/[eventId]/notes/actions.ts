'use server'

import { getOrgAuth, getOrgAuthFull } from '@/lib/supabase/actions'
import { createNoteSchema } from '@/schemas/note.schema'
import type { EventNoteWithAuthor } from '@/types/app'

export async function addNoteAction(eventId: string, content: string): Promise<EventNoteWithAuthor | null> {
  const auth = await getOrgAuthFull()
  if (!auth) return null
  const { supabase, member } = auth

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!event) return null

  const parsed = createNoteSchema.safeParse({ content })
  if (!parsed.success) return null

  const { data } = await supabase
    .from('event_notes')
    .insert({
      event_id: eventId,
      organization_id: member.organization_id,
      author_id: member.id,
      content: parsed.data.content,
    })
    .select('*, author:team_members!author_id(id, full_name, avatar_url)')
    .returns<EventNoteWithAuthor[]>()
    .single()

  return data ?? null
}

export async function deleteNoteAction(eventId: string, noteId: string): Promise<boolean> {
  const auth = await getOrgAuth()
  if (!auth) return false
  const { supabase, member } = auth

  const { error, count } = await supabase
    .from('event_notes')
    .delete({ count: 'exact' })
    .eq('id', noteId)
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)

  return !error && (count ?? 0) > 0
}
