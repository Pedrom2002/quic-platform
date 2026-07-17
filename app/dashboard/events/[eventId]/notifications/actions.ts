'use server'

import { requireOrgAuthFull, assertEventOwnership } from '@/lib/supabase/actions'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchClientUpdate } from '@/lib/notifications/dispatcher'
import type { Event } from '@/types/database'

export async function sendClientUpdateAction(
  eventId: string,
  message: string
): Promise<{ sent: number }> {
  const { supabase, member } = await requireOrgAuthFull()

  const trimmed = message.trim()
  if (!trimmed) throw new Error('Mensagem obrigatória')
  if (trimmed.length > 2000) throw new Error('Mensagem demasiado longa')

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) throw new Error('Evento não encontrado')

  const adminClient = createAdminClient()
  const { data: event } = await adminClient
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (!event) throw new Error('Evento não encontrado')

  return dispatchClientUpdate({ event: event as Event, customMessage: trimmed })
}
