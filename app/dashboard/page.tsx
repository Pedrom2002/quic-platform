import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calendar, Plus, AlertCircle, CheckCircle2, Bell, ArrowRight } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { pt } from 'date-fns/locale'
import { EVENT_STATUS_LABEL, EVENT_STATUS_COLOR } from '@/lib/event-status'
import type { EventWithTypeJoin, NotificationJobWithJoins } from '@/types/app'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: { user } },
    { data: upcomingEvents },
    { data: recentJobs },
    { count: totalClients },
    { count: completedToday },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('events')
      .select('id, name, status, start_datetime, venue_name, event_types(name, color)')
      .in('status', ['planning', 'active'])
      .order('start_datetime', { ascending: true })
      .limit(8) as unknown as Promise<{ data: EventWithTypeJoin[] | null }>,
    supabase
      .from('notification_jobs')
      .select('id, channel, status, sent_at, rendered_subject, clients(full_name), events(name)')
      .in('status', ['delivered', 'failed'])
      .order('sent_at', { ascending: false })
      .limit(6) as unknown as Promise<{ data: NotificationJobWithJoins[] | null }>,
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('event_checklist_items')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completed_at', new Date(Date.now() - 86_400_000).toISOString()),
  ])

  const { data: member } = await supabase
    .from('team_members')
    .select('full_name')
    .eq('auth_user_id', user?.id ?? '')
    .single()

  const firstName = member?.full_name?.split(' ')[0] ?? 'Olá'

  const eventsNeedingAttention = upcomingEvents?.filter(e => {
    const days = differenceInDays(new Date(e.start_datetime), new Date())
    return days <= 7 && e.status === 'planning'
  }) ?? []

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 19 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-slate-400 text-sm mb-0.5">{greeting},</p>
          <h1 className="text-2xl font-bold text-slate-900">{firstName}</h1>
        </div>
        <Link
          href="/dashboard/events/new"
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo evento
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-3xl font-bold text-slate-900">{upcomingEvents?.filter(e => e.status === 'active').length ?? 0}</p>
          <p className="text-sm text-slate-500 mt-1">Eventos ativos</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-3xl font-bold text-slate-900">{completedToday ?? 0}</p>
          <p className="text-sm text-slate-500 mt-1">Etapas concluídas hoje</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-3xl font-bold text-slate-900">{totalClients ?? 0}</p>
          <p className="text-sm text-slate-500 mt-1">Clientes registados</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Eventos — col 3 */}
        <div className="col-span-3 space-y-6">
          {/* Atenção urgente */}
          {eventsNeedingAttention.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-semibold text-yellow-700">Requerem atenção</span>
              </div>
              <div className="space-y-1">
                {eventsNeedingAttention.map(event => (
                  <Link
                    key={event.id}
                    href={`/dashboard/events/${event.id}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-yellow-100 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{event.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {differenceInDays(new Date(event.start_datetime), new Date())} dias para o evento · Em planeamento
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-yellow-400 group-hover:text-yellow-600 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Próximos eventos */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Eventos em curso</h2>
              <Link href="/dashboard/events" className="text-xs text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1">
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {!upcomingEvents?.length ? (
                <div className="px-5 py-10 text-center">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Nenhum evento em preparação</p>
                  <Link href="/dashboard/events/new" className="text-xs text-slate-400 hover:text-slate-700 mt-2 inline-block transition-colors">
                    Criar primeiro evento →
                  </Link>
                </div>
              ) : (
                upcomingEvents.map(event => {
                  const daysUntil = differenceInDays(new Date(event.start_datetime), new Date())
                  const isUrgent = daysUntil <= 3 && daysUntil >= 0
                  return (
                    <Link
                      key={event.id}
                      href={`/dashboard/events/${event.id}`}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: event.event_types?.color ?? '#6366f1' }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{event.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {format(new Date(event.start_datetime), "d MMM · HH'h'mm", { locale: pt })}
                            {event.venue_name && ` · ${event.venue_name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        {isUrgent && daysUntil >= 0 && (
                          <span className="text-xs text-orange-500 font-medium">{daysUntil === 0 ? 'Hoje' : `${daysUntil}d`}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EVENT_STATUS_COLOR[event.status] ?? ''}`}>
                          {EVENT_STATUS_LABEL[event.status]}
                        </span>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Notificações recentes — col 2 */}
        <div className="col-span-2">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Notificações recentes</h2>
              <Bell className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <div className="divide-y divide-slate-100">
              {!recentJobs?.length ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">Sem atividade recente</p>
              ) : (
                recentJobs.map(job => {
                  const sent = job.sent_at ? new Date(job.sent_at) : null
                  return (
                    <div key={job.id} className="px-5 py-3.5">
                      <div className="flex items-start gap-2.5">
                        {job.status === 'delivered'
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                          : <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                        }
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">
                            {job.clients?.full_name ?? '—'}
                          </p>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {job.rendered_subject ?? job.events?.name ?? '—'}
                          </p>
                          <p className="text-xs text-slate-300 mt-1">
                            {sent ? format(sent, "d MMM · HH'h'mm", { locale: pt }) : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
