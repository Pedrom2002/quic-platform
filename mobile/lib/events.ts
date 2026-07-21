import type { SupabaseClient } from '@supabase/supabase-js'

export interface PublicEvent {
  id: string
  name: string
  description: string | null
  venue_name: string | null
  venue_address: string | null
  start_datetime: string
  end_datetime: string
  cover_image_url: string | null
  min_ticket_price_cents: number | null
}

const EVENT_COLUMNS =
  'id, name, description, venue_name, venue_address, start_datetime, end_datetime, cover_image_url'

export async function fetchPublicEvents(supabase: SupabaseClient): Promise<PublicEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('is_public_listed', true)
    .order('start_datetime', { ascending: true })

  if (error || !data) return []

  const events = data as unknown as Omit<PublicEvent, 'min_ticket_price_cents'>[]
  if (events.length === 0) return []

  const { data: ticketTypes } = await supabase
    .from('ticket_types')
    .select('event_id, price_cents')
    .eq('is_active', true)
    .in('event_id', events.map(e => e.id))

  const minPriceByEvent = new Map<string, number>()
  for (const tt of (ticketTypes ?? []) as { event_id: string; price_cents: number }[]) {
    const current = minPriceByEvent.get(tt.event_id)
    if (current === undefined || tt.price_cents < current) {
      minPriceByEvent.set(tt.event_id, tt.price_cents)
    }
  }

  return events.map(e => ({ ...e, min_ticket_price_cents: minPriceByEvent.get(e.id) ?? null }))
}

export async function fetchEventById(supabase: SupabaseClient, id: string): Promise<PublicEvent | null> {
  const { data } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('id', id)
    .single()

  return (data as unknown as PublicEvent) ?? null
}
