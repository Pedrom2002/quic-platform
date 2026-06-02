import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Users, Bell, ExternalLink, MapPin, Pencil, UserCog, Paperclip, ListTree, Newspaper, Dices, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { EVENT_STATUS_LABEL, EVENT_STATUS_COLOR, calcProgress } from '@/lib/event-status'
import type { EventTypeJoin, EventNoteWithAuthor } from '@/types/app'
import { SendPortalButton } from '@/components/events/SendPortalButton'
import { RegeneratePortalButton } from '@/components/events/RegeneratePortalButton'
import AIButtons from '@/components/events/AIButtons'
import { ActivityFeed } from '@/components/events/ActivityFeed'
import NotesSection from '@/components/events/NotesSection'
import { DeleteEventButton } from '@/components/events/DeleteEventButton'
import { mergeTimelineEvents } from '@/lib/timeline'
import type { ChecklistTimelineEvent, NotificationTimelineEvent, ClientTimelineEvent } from '@/lib/timeline'

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()

  // Start auth before data queries — resolves in parallel with the wave below
  const userPromise = supabase.auth.getUser()

  const [
    { data: eventRaw },
    { data: items },
    { count: clientCount },
    { count: teamCount },
    { count: fileCount },
    { count: taskCount },
    { count: articleCount },
    { data: checklistActivity },
    { data: notifActivity },
    { data: clientActivity },
    { data: eventNotes },
    { count: raffleCount },
    { count: reportCount },
  ] = await Promise.all([
    supabase.from('events').select('*, event_types(name, color, icon)').eq('id', eventId).single(),
    supabase.from('event_checklist_items').select('status').eq('event_id', eventId),
    supabase.from('event_clients').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('event_team_assignments').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('event_files').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('event_tasks').select('id', { count: 'exact', head: true }).eq('event_id', eventId).is('parent_id', null),
    supabase.from('event_articles').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('event_checklist_items').select('id, title, client_label, status, updated_at').eq('event_id', eventId).not('status', 'eq', 'pending').order('updated_at', { ascending: false }).limit(30),
    supabase.from('notification_jobs').select('id, channel, status, sent_at, created_at, clients(full_name)').eq('event_id', eventId).order('created_at', { ascending: false }).limit(30),
    supabase.from('event_clients').select('id, role, created_at, clients(full_name)').eq('event_id', eventId).order('created_at', { ascending: false }).limit(30),
    supabase.from('event_notes').select('*, author:team_members!author_id(id, full_name, avatar_url)').eq('event_id', eventId).order('created_at', { ascending: false }).limit(50).returns<EventNoteWithAuthor[]>(),
    supabase.from('event_raffles').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('event_reports').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
  ])

  if (!eventRaw) notFound()

  const event = eventRaw as typeof eventRaw & { event_types: EventTypeJoin | null }

  const total = items?.length ?? 0
  const completed = items?.filter(i => i.status === 'completed').length ?? 0
  const percent = calcProgress(completed, total)

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

  const { data: { user } } = await userPromise
  const { data: currentMember } = user
    ? await supabase.from('team_members').select('id, role').eq('auth_user_id', user.id).single()
    : { data: null }
  const currentMemberId = currentMember?.id ?? null
  const isAdmin = currentMember?.role === 'admin'

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
            {isAdmin && <DeleteEventButton eventId={eventId} />}
            <SendPortalButton eventId={eventId} />
            <RegeneratePortalButton eventId={eventId} />
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
        <div
          className="h-2 bg-slate-100 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso do evento"
        >
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">{completed} de {total} etapas concluídas</p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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

        <Link
          href={`/dashboard/events/${eventId}/team`}
          className="flex items-center gap-3 p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 hover:shadow transition-all"
        >
          <div className="p-2 bg-orange-50 rounded-lg">
            <UserCog className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-slate-800 font-medium">Equipa</p>
            <p className="text-slate-400 text-xs">{teamCount ?? 0} membros</p>
          </div>
        </Link>

        <Link
          href={`/dashboard/events/${eventId}/files`}
          className="flex items-center gap-3 p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 hover:shadow transition-all"
        >
          <div className="p-2 bg-amber-50 rounded-lg">
            <Paperclip className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-slate-800 font-medium">Ficheiros</p>
            <p className="text-slate-400 text-xs">{fileCount ?? 0} ficheiros</p>
          </div>
        </Link>

        <Link
          href={`/dashboard/events/${eventId}/tasks`}
          className="flex items-center gap-3 p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 hover:shadow transition-all"
        >
          <div className="p-2 bg-indigo-50 rounded-lg">
            <ListTree className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-slate-800 font-medium">Tarefas</p>
            <p className="text-slate-400 text-xs">{taskCount ?? 0} tarefas</p>
          </div>
        </Link>

        <Link
          href={`/dashboard/events/${eventId}/cliping` as never}
          className="flex items-center gap-3 p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 hover:shadow transition-all"
        >
          <div className="p-2 bg-rose-50 rounded-lg">
            <Newspaper className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <p className="text-slate-800 font-medium">Cliping</p>
            <p className="text-slate-400 text-xs">{articleCount ?? 0} artigos</p>
          </div>
        </Link>

        <Link
          href={`/dashboard/events/${eventId}/reports` as never}
          className="flex items-center gap-3 p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 hover:shadow transition-all"
        >
          <div className="p-2 bg-teal-50 rounded-lg">
            <FileText className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <p className="text-slate-800 font-medium">Relatórios</p>
            <p className="text-slate-400 text-xs">{reportCount ?? 0} relatório(s)</p>
          </div>
        </Link>

        <Link
          href={`/dashboard/events/${eventId}/sorteios` as never}
          className="flex items-center gap-3 p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 hover:shadow transition-all"
        >
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Dices className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-slate-800 font-medium">Sorteios</p>
            <p className="text-slate-400 text-xs">{raffleCount ?? 0} sorteios</p>
          </div>
        </Link>
      </div>

      <AIButtons eventId={eventId} clientCount={clientCount ?? 0} />

      {/* Internal Notes */}
      <div className="mt-6">
        <NotesSection
          eventId={eventId}
          initialNotes={eventNotes ?? []}
          currentMemberId={currentMemberId}
        />
      </div>

      {/* Activity Feed */}
      <ActivityFeed eventId={eventId} initialEvents={initialTimelineEvents} />
    </div>
  )
}
