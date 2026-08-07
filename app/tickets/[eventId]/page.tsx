// app/tickets/[eventId]/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchEventById } from '@/lib/tickets/events'
import { fetchTicketTypes } from '@/lib/tickets/tickets'
import { TicketSelector } from './TicketSelector'

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default async function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const event = await fetchEventById(supabase, eventId)
  if (!event) notFound()

  const ticketTypes = await fetchTicketTypes(supabase, eventId)

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">
          {formatEventDate(event.start_datetime)}
          {event.venue_name ? ` · ${event.venue_name}` : ''}
        </p>
        <h1 className="text-2xl font-bold text-white mb-2">{event.name}</h1>
        {event.description && <p className="text-zinc-400 text-sm mb-8">{event.description}</p>}

        {ticketTypes.length === 0 ? (
          <p className="text-zinc-400 text-sm">Sem bilhetes disponíveis para este evento.</p>
        ) : (
          <TicketSelector eventId={eventId} ticketTypes={ticketTypes} />
        )}
      </div>
    </div>
  )
}
