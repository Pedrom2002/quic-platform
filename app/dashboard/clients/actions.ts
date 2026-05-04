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

async function assertClientOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  organizationId: string
) {
  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('organization_id', organizationId)
    .single()
  return !!data
}

export async function updateClientAction(
  clientId: string,
  updates: { full_name: string; email: string; phone: string; company: string }
) {
  if (!updates.full_name.trim()) throw new Error('Nome obrigatório')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  const owns = await assertClientOwnership(supabase, clientId, member.organization_id)
  if (!owns) throw new Error('Cliente não encontrado')

  const { error } = await supabase
    .from('clients')
    .update({
      full_name: updates.full_name.trim(),
      email: updates.email.trim() || null,
      phone: updates.phone.trim() || null,
      company: updates.company.trim() || null,
    })
    .eq('id', clientId)
  if (error) throw new Error(error.message)
}

export async function deactivateClientAction(clientId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  const owns = await assertClientOwnership(supabase, clientId, member.organization_id)
  if (!owns) throw new Error('Cliente não encontrado')

  const { error } = await supabase
    .from('clients')
    .update({ is_active: false })
    .eq('id', clientId)
  if (error) throw new Error(error.message)
}

export async function loadClientsAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', member.organization_id)
    .eq('is_active', true)
    .order('full_name')

  return data ?? []
}
