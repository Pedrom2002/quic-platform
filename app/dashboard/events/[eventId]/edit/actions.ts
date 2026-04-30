'use server'

import { createClient } from '@/lib/supabase/server'
import type { UpdateEventInput } from '@/schemas/event.schema'

export async function updateEventAction(eventId: string, data: UpdateEventInput): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: member } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!member) throw new Error('Não autorizado')

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!event) throw new Error('Evento não encontrado')

  const normalise = (s?: string) => s ? new Date(s).toISOString() : undefined

  const { error } = await supabase
    .from('events')
    .update({
      ...data,
      ...(data.start_datetime && { start_datetime: normalise(data.start_datetime) }),
      ...(data.end_datetime && { end_datetime: normalise(data.end_datetime) }),
    })
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)

  if (error) throw new Error(error.message)
}
