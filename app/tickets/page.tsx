import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { fetchPublicEvents } from '@/lib/tickets/events'

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function formatPrice(cents: number | null): string {
  if (cents === null) return ''
  if (cents === 0) return 'Gratuito'
  return `A partir de ${(cents / 100).toFixed(2)} €`
}

export default async function TicketsPage() {
  const supabase = await createClient()
  const events = await fetchPublicEvents(supabase)

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-white mb-8">Próximos Eventos</h1>

        {events.length === 0 ? (
          <p className="text-zinc-400 text-sm">Sem eventos agendados.</p>
        ) : (
          <div className="grid gap-4">
            {events.map(event => (
              <Link
                key={event.id}
                href={`/tickets/${event.id}`}
                className="block rounded-lg border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-700 transition-colors"
              >
                <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">
                  {formatEventDate(event.start_datetime)}
                  {event.venue_name ? ` · ${event.venue_name}` : ''}
                </p>
                <h2 className="text-lg font-semibold text-white">{event.name}</h2>
                {event.min_ticket_price_cents !== null && (
                  <p className="text-sm text-zinc-400 mt-2">{formatPrice(event.min_ticket_price_cents)}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
