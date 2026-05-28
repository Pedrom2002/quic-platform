'use server'

import { requireOrgAuth, requireOrgAuthFull } from '@/lib/supabase/actions'
import type { EventRaffle, EventRaffleEntry, EventRaffleWithEntries } from '@/types/app'

export async function loadRafflesAction(eventId: string): Promise<EventRaffleWithEntries[]> {
  const { supabase } = await requireOrgAuth()

  const { data, error } = await supabase
    .from('event_raffles')
    .select('*, entries:event_raffle_entries(*)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as EventRaffleWithEntries[]
}

export async function createRaffleAction(
  eventId: string,
  fields: { title: string; description?: string; prize?: string }
): Promise<EventRaffle> {
  const { supabase, member } = await requireOrgAuthFull()

  const { data, error } = await supabase
    .from('event_raffles')
    .insert({
      event_id: eventId,
      organization_id: member.organization_id,
      title: fields.title.trim(),
      description: fields.description?.trim() || null,
      prize: fields.prize?.trim() || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as EventRaffle
}

export async function deleteRaffleAction(raffleId: string): Promise<void> {
  const { supabase } = await requireOrgAuth()

  const { error } = await supabase
    .from('event_raffles')
    .delete()
    .eq('id', raffleId)

  if (error) throw new Error(error.message)
}

export async function addEntryAction(
  raffleId: string,
  participantName: string
): Promise<EventRaffleEntry> {
  const { supabase, member } = await requireOrgAuthFull()

  const { data, error } = await supabase
    .from('event_raffle_entries')
    .insert({
      raffle_id: raffleId,
      organization_id: member.organization_id,
      participant_name: participantName.trim(),
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as EventRaffleEntry
}

export async function addEntriesBulkAction(
  raffleId: string,
  names: string[]
): Promise<number> {
  const { supabase, member } = await requireOrgAuthFull()

  const rows = names
    .map(n => n.trim())
    .filter(n => n.length > 0)
    .map(participant_name => ({
      raffle_id: raffleId,
      organization_id: member.organization_id,
      participant_name,
    }))

  if (!rows.length) return 0

  const { error, count } = await supabase
    .from('event_raffle_entries')
    .insert(rows, { count: 'exact' })

  if (error) throw new Error(error.message)
  return count ?? rows.length
}

export async function drawWinnerAction(raffleId: string): Promise<EventRaffleEntry> {
  const { supabase } = await requireOrgAuth()

  // Reset previous winners for this raffle
  await supabase
    .from('event_raffle_entries')
    .update({ is_winner: false, drawn_at: null })
    .eq('raffle_id', raffleId)

  // Pick a random entry
  const { data: entries, error: fetchError } = await supabase
    .from('event_raffle_entries')
    .select('id')
    .eq('raffle_id', raffleId)

  if (fetchError) throw new Error(fetchError.message)
  if (!entries?.length) throw new Error('Sem participantes para sortear')

  const winner = entries[Math.floor(Math.random() * entries.length)]

  const { data, error } = await supabase
    .from('event_raffle_entries')
    .update({ is_winner: true, drawn_at: new Date().toISOString() })
    .eq('id', winner.id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Mark raffle as completed
  await supabase
    .from('event_raffles')
    .update({ status: 'completed', drawn_at: new Date().toISOString() })
    .eq('id', raffleId)

  return data as EventRaffleEntry
}

export async function updateRaffleStatusAction(
  raffleId: string,
  status: 'draft' | 'active' | 'completed'
): Promise<void> {
  const { supabase } = await requireOrgAuth()

  const { error } = await supabase
    .from('event_raffles')
    .update({ status })
    .eq('id', raffleId)

  if (error) throw new Error(error.message)
}
