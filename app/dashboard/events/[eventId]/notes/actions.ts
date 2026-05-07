'use server'

import { createClient } from '@/lib/supabase/server'
import { createNoteSchema } from '@/schemas/note.schema'
import type { EventNoteWithAuthor } from '@/types/app'

export async function addNoteAction(eventId: string, content: string): Promise<EventNoteWithAuthor | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await supabase
    .from('team_members')
    .select('id, organization_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!member) return null

  const parsed = createNoteSchema.safeParse({ content })
  if (!parsed.success) return null

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!event) return null

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: member } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!member) return false

  const { error } = await supabase
    .from('event_notes')
    .delete()
    .eq('id', noteId)
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)

  return !error
}
