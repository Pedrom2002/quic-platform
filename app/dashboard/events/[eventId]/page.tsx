import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Users, Bell, ExternalLink, MapPin, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { EVENT_STATUS_LABEL, EVENT_STATUS_COLOR, calcProgress } from '@/lib/event-status'
import type { EventTypeJoin } from '@/types/app'
import { SendPortalButton } from '@/components/events/SendPortalButton'
import { ActivityFeed } from '@/components/events/ActivityFeed'
import { mergeTimelineEvents } from '@/lib/timeline'
import type { ChecklistTimelineEvent, NotificationTimelineEvent, ClientTimelineEvent } from '@/lib/timeline'

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()

  const { data: eventRaw } = await supabase
    .from('events')
    .select('*, event_types(name, color, icon)')
    .eq('id', eventId)
    .single()

  if (!eventRaw) notFound()

  const event = eventRaw as typeof eventRaw & { event_types: EventTypeJoin | null }

  const { data: items } = await supabase
    .from('event_checklist_items')
    .select('status')
    .eq('event_id', eventId)

  const total = items?.length ?? 0
  const completed = items?.filter(i => i.status === 'completed').length ?? 0
  const percent = calcProgress(completed, total)

  const { count: clientCount } = await supabase
    .from('event_clients')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)

  const [{ data: checklistActivity }, { data: notifActivity }, { data: clientActivity }] = await Promise.all([
    supabase
      .from('event_checklist_items')
      .select('id, title, client_label, status, updated_at')
      .eq('event_id', eventId)
      .not('status', 'eq', 'pending')
      .order('updated_at', { ascending: false })
      .limit(30),
    supabase
      .from('notification_jobs')
      .select('id, channel, status, sent_at, created_at, clients(full_name)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('event_clients')
      .select('id, role, created_at, clients(full_name)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const checklistEvents: ChecklistTimelineEvent[] = (checklistActivity ?? []).map(r => ({
    type: 'checklist',
    id: r.id,
    item_title: (r as Record<string, string | null>).client_label ?? r.title,
    status: r.status,
    member_name: null,
    timestamp: r.updated_at,
  }))

  const notifEvents: NotificationTimelineEvent[] = (notifActivity ?? []).map(r => {
    const client = r.clients as unknown as { full_name: string } | null
    return {
      type: 'notification',
      id: r.id,
      client_name: client?.full_name ?? 'Cliente',
      channel: r.channel,
      status: r.status,
      timestamp: r.sent_at ?? r.created_at,
    }
  })

  const clientEvents: ClientTimelineEvent[] = (clientActivity ?? []).map(r => {
    const client = r.clients as unknown as { full_name: string } | null
    return {
      type: 'client',
      id: r.id,
      client_name: client?.full_name ?? 'Cliente',
      action: 'added',
      role: r.role,
      timestamp: r.created_at,
    }
  })

  const initialTimelineEvents = mergeTimelineEvents(checklistEvents, notifEvents, clientEvents)

  const portalUrl = `${process.env.NEXT_PUBLIC_PORTAL_URL ?? ''}/portal/${event.portal_token}`
  const et = event.event_types

  return (
    <div className="p-8">
      {/* Back + header */}
      <div className="mb-6">
        <Link href="/dashboard/events" className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> Eventos
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{event.name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${EVENT_STATUS_COLOR[event.status] ?? ''}`}>
                {EVENT_STATUS_LABEL[event.status]}
              </span>
            </div>
            <div className="flex items-center gap-4 text-slate-400 text-sm">
              <span>{format(new Date(event.start_datetime), "d MMM yyyy · HH'h'mm", { locale: pt })}</span>
              {event.venue_name && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {event.venue_name}
                </span>
              )}
              {et?.name && <span className="text-slate-300">{et.name}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SendPortalButton eventId={eventId} />
            <Link
              href={`/dashboard/events/${eventId}/edit`}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </Link>
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Portal do Cliente
            </a>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6 p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-500">Progresso do Evento</span>
          <span className="text-sm font-semibold text-slate-800">{percent}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">{completed} de {total} etapas concluídas</p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-4">
        <Link
          href={`/dashboard/events/${eventId}/checklist`}
          className="flex items-center gap-3 p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 hover:shadow transition-all"
        >
          <div className="p-2 bg-green-50 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-slate-800 font-medium">Checklist</p>
            <p className="text-slate-400 text-xs">{total} etapas</p>
          </div>
        </Link>

        <Link
          href={`/dashboard/events/${eventId}/clients`}
          className="flex items-center gap-3 p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 hover:shadow transition-all"
        >
          <div className="p-2 bg-blue-50 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-slate-800 font-medium">Clientes</p>
            <p className="text-slate-400 text-xs">{clientCount ?? 0} contactos</p>
          </div>
        </Link>

        <Link
          href={`/dashboard/events/${eventId}/notifications`}
          className="flex items-center gap-3 p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 hover:shadow transition-all"
        >
          <div className="p-2 bg-violet-50 rounded-lg">
            <Bell className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="text-slate-800 font-medium">Notificações</p>
            <p className="text-slate-400 text-xs">Log de envios</p>
          </div>
        </Link>
      </div>

      {/* Activity Feed */}
      <ActivityFeed eventId={eventId} initialEvents={initialTimelineEvents} />
    </div>
  )
}
