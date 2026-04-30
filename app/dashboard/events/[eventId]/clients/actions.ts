'use server'

import { createClient } from '@/lib/supabase/server'

async function resolveOrgMember(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('auth_user_id', userId)
    .single()
  return data
}

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

export async function loadEventClientsAction(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

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
    .insert({ event_id: eventId, client_id: clientId, role })
  if (error) throw new Error(error.message)
}

export async function createAndAddClientAction(
  eventId: string,
  newClient: { full_name: string; email: string; phone: string; company: string },
  role: 'primary_contact' | 'cc' | 'vip' | 'vendor'
) {
  if (!newClient.full_name.trim()) throw new Error('Nome obrigatório')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

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
    .insert({ event_id: eventId, client_id: client.id, role })
  if (ece) throw new Error(ece.message)
}

export async function toggleChannelAction(
  eventId: string,
  ecId: string,
  updatedChannels: string[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) throw new Error('Evento não encontrado')

  const { error } = await supabase
    .from('event_clients')
    .delete()
    .eq('id', ecId)
    .eq('event_id', eventId)
  if (error) throw new Error(error.message)
}
