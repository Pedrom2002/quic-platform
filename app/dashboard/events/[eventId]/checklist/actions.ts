'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireOrgAuthFull, getOrgAuth, getOrgAuthFull, assertEventOwnership } from '@/lib/supabase/actions'
import { dispatchNotificationsForItem, dispatchStartNotificationForItem } from '@/lib/notifications/dispatcher'
import type { ChecklistItemStatus } from '@/types/app'
import type { TablesUpdate } from '@/types/database'

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

  const updateData: TablesUpdate<'event_checklist_items'> = { status }
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

  const updateData: TablesUpdate<'event_checklist_items'> = { ...fields }
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
      await dispatchNotificationsForItem({ event, item: data, completedByName: member.full_name ?? 'Equipa QUIC' })
    }
  }

  if (fields.status === 'in_progress' && data) {
    const adminClient = createAdminClient()
    const { data: event } = await adminClient.from('events').select('*').eq('id', eventId).single()
    if (event) {
      await dispatchStartNotificationForItem({ event, item: data })
    }
  }

  return data
}
