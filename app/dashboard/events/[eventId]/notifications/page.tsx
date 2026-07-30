import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { SendUpdateDialog } from './send-update-dialog'

const channelLabel: Record<string, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  portal: 'Portal',
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  delivered: { label: 'Entregue', icon: CheckCircle2, color: 'text-green-600' },
  failed: { label: 'Falhou', icon: XCircle, color: 'text-red-500' },
  queued: { label: 'Na fila', icon: Clock, color: 'text-yellow-600' },
  sent: { label: 'Enviado', icon: CheckCircle2, color: 'text-blue-500' },
}

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()

  const [{ data: event }, { data: jobs }] = await Promise.all([
    supabase.from('events').select('id, name').eq('id', eventId).single(),
    supabase
      .from('notification_jobs')
      .select('*, client:clients(full_name, email), checklist_item:event_checklist_items(title, client_label), article:event_articles(title)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  if (!event) notFound()

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href={`/dashboard/events/${eventId}`} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors w-fit">
            <ArrowLeft className="w-4 h-4" /> {event.name}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Log de Notificações</h1>
          <p className="text-slate-500 mt-1">{jobs?.length ?? 0} notificações registadas</p>
        </div>
        <SendUpdateDialog eventId={eventId} />
      </div>

      {!jobs?.length ? (
        <p className="text-slate-400 text-sm text-center py-16">Nenhuma notificação enviada ainda.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
          {jobs.map(job => {
            type JobClient = { full_name: string; email: string | null } | null
            type JobItem = { title: string; client_label: string | null } | null
            const client = job.client as JobClient
            const item = job.checklist_item as JobItem
            type JobArticle = { title: string } | null
            const article = job.article as JobArticle
            const cfg = statusConfig[job.status] ?? statusConfig.queued
            const Icon = cfg.icon
            return (
              <div key={job.id} className="flex items-center gap-4 px-5 py-4">
                <Icon className={`w-4 h-4 shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 text-sm font-medium">
                    {client?.full_name ?? 'Cliente'}
                    {client?.email && <span className="text-slate-400 font-normal ml-2">{client.email}</span>}
                  </p>
                  {item && (
                    <p className="text-slate-500 text-xs mt-0.5">
                      {item.client_label ?? item.title}
                    </p>
                  )}
                  {article && (
                    <p className="text-slate-500 text-xs mt-0.5">
                      Artigo: {article.title}
                    </p>
                  )}
                  {job.rendered_subject && (
                    <p className="text-slate-400 text-xs mt-0.5 truncate">{job.rendered_subject}</p>
                  )}
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {channelLabel[job.channel] ?? job.channel}
                  </span>
                  {job.created_at && (
                    <p className="text-slate-400 text-xs">
                      {format(new Date(job.created_at), "d MMM · HH'h'mm", { locale: pt })}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
