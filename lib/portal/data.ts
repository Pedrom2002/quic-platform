import { createAdminClient } from '@/lib/supabase/admin'
import { verifyPortalToken } from './token'
import { calcProgress } from '@/lib/event-status'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

export interface PortalItem {
  id: string
  client_label: string | null
  title: string
  status: string
  completed_at: string | null
  completion_note: string | null
  position: number
}

export interface PortalEventData {
  event: {
    id: string
    name: string
    venue_name: string | null
    start_datetime: string
    status: string
  }
  eventDateStr: string
  items: PortalItem[]
  progress: { total: number; completed: number; percent: number }
  heroVideo: string | null
  contentVideo: string | null
}

/**
 * Resolves a portal token and fetches all data needed to render the portal page
 * or the portal API response. Returns null if the token is invalid or the event
 * does not exist.
 */
export async function getPortalData(token: string): Promise<PortalEventData | null> {
  const payload = await verifyPortalToken(token)
  if (!payload) return null

  const supabase = createAdminClient()

  const { data: eventRaw } = await supabase
    .from('events')
    .select('id, name, venue_name, start_datetime, status, settings')
    .eq('id', payload.eventId)
    .single()

  if (!eventRaw) return null

  const eventSettings = (eventRaw.settings ?? {}) as Record<string, unknown>
  const heroVideo = typeof eventSettings.portal_hero_video === 'string' ? eventSettings.portal_hero_video : null
  const contentVideo = typeof eventSettings.portal_content_video === 'string' ? eventSettings.portal_content_video : null

  const event = eventRaw as PortalEventData['event']

  const { data: itemsRaw } = await supabase
    .from('event_checklist_items')
    .select('id, client_label, title, status, completed_at, completion_note, position')
    .eq('event_id', payload.eventId)
    .eq('is_client_visible', true)
    .order('position', { ascending: true })

  const items = (itemsRaw ?? []) as PortalItem[]
  const total = items.length
  const completed = items.filter(i => i.status === 'completed').length

  return {
    event,
    eventDateStr: format(new Date(event.start_datetime), "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt }),
    items,
    progress: { total, completed, percent: calcProgress(completed, total) },
    heroVideo,
    contentVideo,
  }
}
