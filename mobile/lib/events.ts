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
  return data as unknown as PublicEvent[]
}

export async function fetchEventById(supabase: SupabaseClient, id: string): Promise<PublicEvent | null> {
  const { data } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('id', id)
    .single()

  return (data as unknown as PublicEvent) ?? null
}
