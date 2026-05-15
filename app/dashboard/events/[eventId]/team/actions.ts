'use server'

import { requireOrgAuth, assertEventOwnership } from '@/lib/supabase/actions'
import { audit } from '@/lib/audit'
import type { EventTeamAssignmentWithMember } from '@/types/app'

export async function loadEventTeamAction(eventId: string): Promise<{
  assignments: EventTeamAssignmentWithMember[]
  orgMembers: { id: string; full_name: string; email: string; role: string; avatar_url: string | null }[]
}> {
  const { supabase, member } = await requireOrgAuth()

  const owned = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owned) throw new Error('Evento não encontrado')

  const { data: assignments } = await supabase
    .from('event_team_assignments')
    .select('id, event_id, team_member_id, role_in_event, created_at, team_member:team_members!team_member_id(id, full_name, email, role, avatar_url)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
    .returns<EventTeamAssignmentWithMember[]>()

  const { data: orgMembers } = await supabase
    .from('team_members')
    .select('id, full_name, email, role, avatar_url')
    .eq('organization_id', member.organization_id)
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  return {
    assignments: assignments ?? [],
    orgMembers: orgMembers ?? [],
  }
}

export async function assignTeamMemberAction(
  eventId: string,
  teamMemberId: string,
  roleInEvent?: string
): Promise<void> {
  const { supabase, user, member } = await requireOrgAuth()

  const owned = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owned) throw new Error('Evento não encontrado')

  // Verify team member belongs to same org
  const { data: tm } = await supabase
    .from('team_members')
    .select('id')
    .eq('id', teamMemberId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!tm) throw new Error('Membro não pertence à organização')

  const { error } = await supabase
    .from('event_team_assignments')
    .insert({ event_id: eventId, team_member_id: teamMemberId, role_in_event: roleInEvent ?? null })

  if (error) {
    if (error.code === '23505') throw new Error('Membro já está atribuído a este evento')
    throw new Error('Erro ao atribuir membro')
  }

  audit({
    action: 'member.invited',
    userId: user.id,
    organizationId: member.organization_id,
    eventId,
    meta: { teamMemberId, roleInEvent },
  })
}

export async function removeTeamMemberAction(
  eventId: string,
  assignmentId: string
): Promise<void> {
  const { supabase, member } = await requireOrgAuth()

  const owned = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owned) throw new Error('Evento não encontrado')

  const { error } = await supabase
    .from('event_team_assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('event_id', eventId)

  if (error) throw new Error('Erro ao remover membro')
}
