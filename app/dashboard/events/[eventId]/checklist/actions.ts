'use server'

import { createClient } from '@/lib/supabase/server'
import { resolveOrgMember } from '@/lib/supabase/actions'
import type { ChecklistItemStatus } from '@/types/app'

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

export async function bulkUpdateChecklistStatusAction(
  eventId: string,
  ids: string[],
  status: ChecklistItemStatus
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  if (!ids.length) throw new Error('Nenhum item selecionado')
  if (ids.length > 50) throw new Error('Máximo 50 items por operação')

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) throw new Error('Evento não encontrado')

  const updateData: Record<string, unknown> = { status }
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
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
    await Promise.allSettled(
      ids.map(id =>
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/events/${eventId}/checklist-items/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed', _notifyOnly: true }),
        })
      )
    )
  }
}

export async function reorderChecklistItemsAction(
  eventId: string,
  orderedIds: string[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) throw new Error('Não autorizado')

  if (!orderedIds.length) throw new Error('Nenhum item para reordenar')
  if (orderedIds.length > 200) throw new Error('Máximo 200 items por operação')

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) throw new Error('Evento não encontrado')

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('event_checklist_items')
        .update({ position: (index + 1) * 10 })
        .eq('id', id)
        .eq('event_id', eventId)
    )
  )
}
