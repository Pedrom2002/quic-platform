'use server'

import { requireOrgAuth, assertEventOwnership } from '@/lib/supabase/actions'

export async function reorderChecklistItemsAction(
  eventId: string,
  orderedIds: string[]
) {
  const { supabase, member } = await requireOrgAuth()

  if (!orderedIds.length) throw new Error('Nenhum item para reordenar')
  if (orderedIds.length > 200) throw new Error('Máximo 200 items por operação')

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) throw new Error('Evento não encontrado')

  // Validate that all IDs belong to this event before the bulk upsert.
  // Prevents cross-event position manipulation if client sends foreign IDs.
  const { data: validRows } = await supabase
    .from('event_checklist_items')
    .select('id')
    .in('id', orderedIds)
    .eq('event_id', eventId)

  const validIds = new Set((validRows ?? []).map(r => r.id))
  const rows = orderedIds
    .filter(id => validIds.has(id))
    .map((id, index) => ({ id, position: (index + 1) * 10 }))

  if (rows.length) {
    // update por linha em vez de upsert: os ids ja foram validados acima
    // como pertencentes a este evento, isto nunca insere, so reordena.
    await Promise.all(
      rows.map(row =>
        supabase.from('event_checklist_items').update({ position: row.position }).eq('id', row.id)
      )
    )
  }
}
