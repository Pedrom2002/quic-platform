import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, MapPin, Calendar, ArrowRight } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button'
import { format, differenceInDays } from 'date-fns'
import { pt } from 'date-fns/locale'
import { EVENT_STATUS_LABEL, EVENT_STATUS_COLOR, calcProgress } from '@/lib/event-status'
import type { EventTypeJoin } from '@/types/app'

export default async function EventsPage() {
  const supabase = await createClient()

  const { data: eventsRaw } = await supabase
    .from('events')
    .select('*, event_types(name, color, icon)')
    .order('start_datetime', { ascending: true })
    .limit(100)

  const events = (eventsRaw ?? []) as (typeof eventsRaw extends (infer T)[] | null ? T : never)[]

  const eventIds = (eventsRaw ?? []).map(e => e.id)

  const { data: checklistCounts } = eventIds.length
    ? await supabase
        .from('event_checklist_items')
        .select('event_id, status')
        .in('event_id', eventIds)
    : { data: [] }

  const progressMap: Record<string, { total: number; completed: number }> = {}
  for (const item of checklistCounts ?? []) {
    if (!progressMap[item.event_id]) progressMap[item.event_id] = { total: 0, completed: 0 }
    progressMap[item.event_id].total++
    if (item.status === 'completed') progressMap[item.event_id].completed++
  }

  const active = events.filter(e => e.status === 'active').length
  const planning = events.filter(e => e.status === 'planning').length
  const completed = events.filter(e => e.status === 'completed').length

  const now = new Date()

  return (
    <div className="p-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Eventos</h1>
          <p className="text-slate-400 text-sm mt-1">{events.length} eventos no total</p>
        </div>
        <ButtonLink href="/dashboard/events/new">
          <Plus className="w-4 h-4 mr-2" />
          Novo Evento
        </ButtonLink>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{active}</p>
          <p className="text-xs text-slate-500 mt-1">Ativos</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{planning}</p>
          <p className="text-xs text-slate-500 mt-1">Em planeamento</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{completed}</p>
          <p className="text-xs text-slate-500 mt-1">Concluídos</p>
        </div>
      </div>

      {!events.length ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm text-center py-20">
          <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 text-sm mb-4">Nenhum evento criado ainda.</p>
          <ButtonLink href="/dashboard/events/new" variant="outline">Criar o primeiro evento</ButtonLink>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map(event => {
            const et = event.event_types as EventTypeJoin | null
            const prog = progressMap[event.id] ?? { total: 0, completed: 0 }
            const percent = calcProgress(prog.completed, prog.total)
            const daysUntil = differenceInDays(new Date(event.start_datetime), now)
            const isPast = daysUntil < 0
            const isUrgent = daysUntil >= 0 && daysUntil <= 7

            return (
              <Link
                key={event.id}
                href={`/dashboard/events/${event.id}`}
                className="group bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all overflow-hidden flex flex-col"
              >
                <div className="p-5 flex flex-col flex-1 gap-4">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate leading-tight">{event.name}</p>
                      {et?.name && (
                        <p className="text-xs text-slate-400 mt-0.5">{et.name}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${EVENT_STATUS_COLOR[event.status] ?? ''}`}>
                      {EVENT_STATUS_LABEL[event.status]}
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      {format(new Date(event.start_datetime), "d MMM yyyy · HH'h'mm", { locale: pt })}
                    </span>
                    {event.venue_name && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {event.venue_name}
                      </span>
                    )}
                  </div>

                  {/* Progress */}
                  {prog.total > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-400">Progresso</span>
                        <span className="tabular-nums font-medium text-slate-600">{prog.completed}/{prog.total}</span>
                      </div>
                      <div
                        className="h-1.5 bg-slate-100 rounded-full overflow-hidden"
                        role="progressbar"
                        aria-valuenow={percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Progresso: ${prog.completed} de ${prog.total} etapas`}
                      >
                        <div
                          className="h-full rounded-full bg-slate-800 transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto pt-1">
                    {!isPast ? (
                      <span className={`text-xs font-medium ${isUrgent ? 'text-orange-500' : 'text-slate-400'}`}>
                        {daysUntil === 0 ? 'Hoje' : `em ${daysUntil} dia${daysUntil === 1 ? '' : 's'}`}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">Passado</span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
