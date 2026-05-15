'use server'

import { requireOrgAuth } from '@/lib/supabase/actions'
import { audit } from '@/lib/audit'
import type { UpdateEventInput } from '@/schemas/event.schema'

export async function deleteEventAction(eventId: string): Promise<void> {
  const { supabase, user, member } = await requireOrgAuth()
  if (member.role !== 'admin') throw new Error('Apenas administradores podem eliminar eventos')

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)

  if (error) throw new Error(error.message)

  audit({
    action: 'event.deleted',
    userId: user.id,
    organizationId: member.organization_id,
    eventId,
    meta: {},
  })
}

export async function updateEventAction(eventId: string, data: UpdateEventInput): Promise<void> {
  const { supabase, user, member } = await requireOrgAuth()

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

  if (data.status) {
    audit({
      action: 'event.status.changed',
      userId: user.id,
      organizationId: member.organization_id,
      eventId,
      meta: { newStatus: data.status },
    })
  }
}

export async function updatePortalVideosAction(
  eventId: string,
  heroVideo: string,
  contentVideo: string,
): Promise<void> {
  const { supabase, member } = await requireOrgAuth()

  const { data: event } = await supabase
    .from('events')
    .select('id, settings')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!event) throw new Error('Evento não encontrado')

  const currentSettings = (event.settings ?? {}) as Record<string, unknown>
  const newSettings = {
    ...currentSettings,
    portal_hero_video: heroVideo || null,
    portal_content_video: contentVideo || null,
  }

  const { error } = await supabase
    .from('events')
    .update({ settings: newSettings })
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)

  if (error) throw new Error(error.message)
}
