import { createClient } from '@/lib/supabase/server'
import type { EventType } from '@/types/database'
import { NewEventClient } from './NewEventClient'

export default async function NewEventPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('event_types')
    .select('*')
    .eq('is_active', true)
    .order('name')

  const eventTypes = (data ?? []) as EventType[]

  return <NewEventClient eventTypes={eventTypes} />
}
