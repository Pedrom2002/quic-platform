'use server'

import { requireOrgAuth } from '@/lib/supabase/actions'
import { assertEventOwnership } from '@/lib/supabase/actions'

export async function loadEventClientsAction(eventId: string) {
  const { supabase, member } = await requireOrgAuth()

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) throw new Error('Evento não encontrado')

  const [{ data: eventClients }, { data: allClients }] = await Promise.all([
    supabase
      .from('event_clients')
      .select('*, client:clients(*)')
      .eq('event_id', eventId),
    supabase
      .from('clients')
      .select('*')
      .eq('organization_id', member.organization_id)
      .eq('is_active', true)
      .order('full_name'),
  ])

  return { eventClients: eventClients ?? [], allClients: allClients ?? [] }
}

export async function addExistingClientAction(
  eventId: string,
  clientId: string,
  role: 'primary_contact' | 'cc' | 'vip' | 'vendor'
) {
  const { supabase, member } = await requireOrgAuth()

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) throw new Error('Evento não encontrado')

  // Confirm the client belongs to the same organisation
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!client) throw new Error('Cliente não encontrado')

  const { error } = await supabase
    .from('event_clients')
    .insert({ event_id: eventId, client_id: clientId, role, notification_prefs: { channels: ['email', 'portal'], language: 'pt' } })
  if (error) throw new Error(error.message)
}

export async function createAndAddClientAction(
  eventId: string,
  newClient: { full_name: string; email: string; phone: string; company: string },
  role: 'primary_contact' | 'cc' | 'vip' | 'vendor'
) {
  if (!newClient.full_name.trim()) throw new Error('Nome obrigatório')

  const { supabase, member } = await requireOrgAuth()

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) throw new Error('Evento não encontrado')

  const { data: client, error: ce } = await supabase
    .from('clients')
    .insert({ ...newClient, organization_id: member.organization_id })
    .select()
    .single()
  if (ce) throw new Error(ce.message)

  const { error: ece } = await supabase
    .from('event_clients')
    .insert({ event_id: eventId, client_id: client.id, role, notification_prefs: { channels: ['email', 'portal'], language: 'pt' } })
  if (ece) throw new Error(ece.message)
}

export async function toggleChannelAction(
  eventId: string,
  ecId: string,
  updatedChannels: string[]
) {
  const { supabase, member } = await requireOrgAuth()

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) throw new Error('Evento não encontrado')

  const { error } = await supabase
    .from('event_clients')
    .update({ notification_prefs: { channels: updatedChannels, language: 'pt' } })
    .eq('id', ecId)
    .eq('event_id', eventId)
  if (error) throw new Error(error.message)
}

export async function removeClientAction(eventId: string, ecId: string) {
  const { supabase, member } = await requireOrgAuth()

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) throw new Error('Evento não encontrado')

  const { error } = await supabase
    .from('event_clients')
    .delete()
    .eq('id', ecId)
    .eq('event_id', eventId)
  if (error) throw new Error(error.message)
}
