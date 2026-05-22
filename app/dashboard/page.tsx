import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Plus, AlertCircle, CheckCircle2, Bell, ArrowRight } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { pt } from 'date-fns/locale'
import { EVENT_STATUS_LABEL, EVENT_STATUS_COLOR } from '@/lib/event-status'
import type { EventWithTypeJoin, NotificationJobWithJoins } from '@/types/app'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Auth runs concurrently with event/notification queries
  const userPromise = supabase.auth.getUser()

  const [
    eventsResult,
    jobsResult,
    { count: totalClients },
    { count: completedToday },
    { data: { user } },
  ] = await Promise.all([
    supabase
      .from('events')
      .select('id, name, status, start_datetime, venue_name, event_types(name, color)')
      .in('status', ['planning', 'active'])
      .order('start_datetime', { ascending: true })
      .limit(8),
    supabase
      .from('notification_jobs')
      .select('id, channel, status, sent_at, rendered_subject, clients(full_name), events(name)')
      .in('status', ['delivered', 'failed'])
      .order('sent_at', { ascending: false })
      .limit(6),
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('event_checklist_items')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completed_at', new Date(Date.now() - 86_400_000).toISOString()),
    userPromise,
  ])

  const upcomingEvents = eventsResult.data as EventWithTypeJoin[] | null
  const recentJobs = jobsResult.data as NotificationJobWithJoins[] | null

  const { data: memberRaw } = user
    ? await supabase.from('team_members').select('full_name').eq('auth_user_id', user.id).single()
    : { data: null }
  const member = memberRaw as { full_name: string } | null

  const firstName = member?.full_name?.split(' ')[0] ?? 'Olá'

  const eventsNeedingAttention = upcomingEvents?.filter(e => {
    const days = differenceInDays(new Date(e.start_datetime), new Date())
    return days <= 7 && e.status === 'planning'
  }) ?? []

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 19 ? 'Boa tarde' : 'Boa noite'
  const activeCount = upcomingEvents?.filter(e => e.status === 'active').length ?? 0

  return (
    <div className="min-h-screen" style={{ background: '#f5f5f5' }}>

      {/* Dark header */}
      <header style={{ background: 'linear-gradient(135deg, #111111 0%, #1a1a1a 100%)' }}>
        <div className="max-w-5xl mx-auto px-8">

          {/* Top bar */}
          <div className="flex items-center justify-between py-5 border-b border-white/10">
            <Image src="/logo-branco.png" alt="Quic" width={130} height={52} priority />
            <Link
              href="/dashboard/events/new"
              className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo evento
            </Link>
          </div>

          {/* Greeting */}
          <div className="pt-8 pb-6">
            <p className="text-[10px] font-medium tracking-[0.35em] uppercase text-white/40 mb-3">
              {greeting}
            </p>
            <h1
              className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.0] mb-2"
              style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
            >
              {firstName}
            </h1>
            <p className="text-sm text-white/40">
              {format(new Date(), "d 'de' MMMM", { locale: pt })} · {activeCount} eventos ativos
            </p>
          </div>

          {/* KPI strip */}
          <div className="flex border-t border-white/10">
            <div className="flex-1 py-5 pr-6 border-r border-white/10">
              <p className="text-2xl font-bold text-white">{activeCount}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Eventos ativos</p>
            </div>
            <div className="flex-1 py-5 px-6 border-r border-white/10">
              <p className="text-2xl font-bold text-white">{completedToday ?? 0}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Etapas hoje</p>
            </div>
            <div className="flex-1 py-5 pl-6">
              <p className="text-2xl font-bold text-white">{totalClients ?? 0}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Clientes</p>
            </div>
          </div>

        </div>
      </header>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="grid grid-cols-5 gap-6">

          {/* Events col 3 */}
          <div className="col-span-3 space-y-4">

            {/* Urgency alert */}
            {eventsNeedingAttention.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800">Requerem atenção</span>
                </div>
                <div className="space-y-1">
                  {eventsNeedingAttention.map(event => (
                    <Link
                      key={event.id}
                      href={`/dashboard/events/${event.id}`}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-amber-100 transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-medium text-stone-800">{event.name}</p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {differenceInDays(new Date(event.start_datetime), new Date())} dias · Em planeamento
                        </p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-600 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Events card */}
            <div className="bg-white border border-stone-200 rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                <h2 className="text-sm font-semibold text-stone-800">Eventos em curso</h2>
                <Link href="/dashboard/events" className="text-xs text-stone-400 hover:text-stone-700 transition-colors flex items-center gap-1">
                  Ver todos <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-stone-100">
                {!upcomingEvents?.length ? (
                  <div className="px-5 py-10 text-center">
                    <Calendar className="w-8 h-8 text-stone-300 mx-auto mb-3" />
                    <p className="text-stone-400 text-sm">Nenhum evento em preparação</p>
                    <Link href="/dashboard/events/new" className="text-xs text-stone-400 hover:text-stone-700 mt-2 inline-block transition-colors">
                      Criar primeiro evento
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
                        className="flex items-center justify-between px-5 py-3.5 hover:bg-stone-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: event.event_types?.color ?? '#6366f1' }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-800 truncate">{event.name}</p>
                            <p className="text-xs text-stone-400 mt-0.5">
                              {format(new Date(event.start_datetime), "d MMM · HH'h'mm", { locale: pt })}
                              {event.venue_name && ` · ${event.venue_name}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          {isUrgent && (
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

          {/* Notifications col 2 */}
          <div className="col-span-2">
            <div className="bg-white border border-stone-200 rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                <h2 className="text-sm font-semibold text-stone-800">Notificações recentes</h2>
                <Bell className="w-3.5 h-3.5 text-stone-300" />
              </div>
              <div className="divide-y divide-stone-100">
                {!recentJobs?.length ? (
                  <p className="px-5 py-8 text-center text-sm text-stone-400">Sem atividade recente</p>
                ) : (
                  recentJobs.map(job => {
                    const sent = job.sent_at ? new Date(job.sent_at) : null
                    return (
                      <div key={job.id} className="px-5 py-3.5">
                        <div className="flex items-start gap-2.5">
                          {job.status === 'delivered'
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                            : <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                          }
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-stone-700 truncate">
                              {job.clients?.full_name ?? '—'}
                            </p>
                            <p className="text-xs text-stone-400 truncate mt-0.5">
                              {job.rendered_subject ?? job.events?.name ?? '—'}
                            </p>
                            <p className="text-xs text-stone-300 mt-1">
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
    </div>
  )
}
