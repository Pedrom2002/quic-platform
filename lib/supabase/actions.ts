'use server'

import { createClient } from '@/lib/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>
type OrgMember = { organization_id: string; role: string }
type OrgMemberFull = { id: string; full_name: string; organization_id: string; role: string }

export async function resolveOrgMember(
  supabase: SupabaseClient,
  userId: string
): Promise<OrgMember | null> {
  const { data } = await supabase
    .from('team_members')
    .select('organization_id, role')
    .eq('auth_user_id', userId)
    .single()
  return data
}

// Variant that also returns id and full_name — used where the member identity
// needs to be recorded (e.g. completed_by, linked_by fields).
export async function resolveOrgMemberFull(
  supabase: SupabaseClient,
  userId: string
): Promise<OrgMemberFull | null> {
  const { data } = await supabase
    .from('team_members')
    .select('id, full_name, organization_id, role')
    .eq('auth_user_id', userId)
    .single()
  return data
}

export async function assertEventOwnership(
  supabase: SupabaseClient,
  eventId: string,
  organizationId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('organization_id', organizationId)
    .single()
  return !!data
}

// Auth helpers — replace the 4-line auth boilerplate in every Server Action.
//
// requireOrgAuth / requireOrgAuthFull: throw on unauthenticated/unauthorized.
// Use in Server Actions that surface errors to the UI (via throw).
//
// getOrgAuth / getOrgAuthFull: return null on failure.
// Use in Server Actions that degrade gracefully (return null / false / []).

export async function requireOrgAuth(): Promise<{ supabase: SupabaseClient; user: import('@supabase/supabase-js').User; member: OrgMember }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')
  return { supabase, user, member }
}

export async function requireOrgAuthFull(): Promise<{ supabase: SupabaseClient; user: import('@supabase/supabase-js').User; member: OrgMemberFull }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const member = await resolveOrgMemberFull(supabase, user.id)
  if (!member) throw new Error('Não autorizado')
  return { supabase, user, member }
}

export async function getOrgAuth(): Promise<{ supabase: SupabaseClient; user: import('@supabase/supabase-js').User; member: OrgMember } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return null
  return { supabase, user, member }
}

export async function getOrgAuthFull(): Promise<{ supabase: SupabaseClient; user: import('@supabase/supabase-js').User; member: OrgMemberFull } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const member = await resolveOrgMemberFull(supabase, user.id)
  if (!member) return null
  return { supabase, user, member }
}
