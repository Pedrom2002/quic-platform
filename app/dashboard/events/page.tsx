import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, MapPin } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { EVENT_STATUS_LABEL, EVENT_STATUS_COLOR } from '@/lib/event-status'
import type { EventTypeJoin } from '@/types/app'

export default async function EventsPage() {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('*, event_types(name, color, icon)')
    .order('start_datetime', { ascending: true })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Eventos</h1>
          <p className="text-slate-500 mt-1">{events?.length ?? 0} eventos no total</p>
        </div>
        <ButtonLink href="/dashboard/events/new">
          <Plus className="w-4 h-4 mr-2" />
          Novo Evento
        </ButtonLink>
      </div>

      {!events?.length ? (
        <div className="text-center py-20">
          <p className="text-slate-400 mb-4">Nenhum evento criado ainda.</p>
          <ButtonLink href="/dashboard/events/new" variant="outline">Criar o primeiro evento</ButtonLink>
        </div>
      ) : (
        <div className="grid gap-2">
          {events.map(event => {
            const et = event.event_types as EventTypeJoin | null
            return (
              <Link
                key={event.id}
                href={`/dashboard/events/${event.id}`}
                className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group"
              >
                <div
                  className="w-10 h-10 rounded-lg shrink-0"
                  style={{ backgroundColor: et?.color + '20', borderLeft: `3px solid ${et?.color}` }}
                />

                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 font-medium truncate">{event.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-slate-400 text-xs">
                      {format(new Date(event.start_datetime), "d MMM yyyy · HH'h'mm", { locale: pt })}
                    </span>
                    {event.venue_name && (
                      <span className="flex items-center gap-1 text-slate-400 text-xs">
                        <MapPin className="w-3 h-3" />
                        {event.venue_name}
                      </span>
                    )}
                    <span className="text-slate-300 text-xs">{et?.name}</span>
                  </div>
                </div>

                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${EVENT_STATUS_COLOR[event.status] ?? ''}`}>
                  {EVENT_STATUS_LABEL[event.status]}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
