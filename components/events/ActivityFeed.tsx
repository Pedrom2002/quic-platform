'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'
import { CheckCircle2, Bell, UserPlus } from 'lucide-react'
import type { TimelineEvent, ChecklistTimelineEvent, NotificationTimelineEvent, ClientTimelineEvent } from '@/lib/timeline'
import { mergeTimelineEvents } from '@/lib/timeline'

const STATUS_PT: Record<string, string> = {
  completed: 'concluído',
  in_progress: 'em progresso',
  skipped: 'ignorado',
  pending: 'reposto',
  delivered: 'entregue',
  failed: 'falhou',
  queued: 'na fila',
}

const CHANNEL_PT: Record<string, string> = {
  email: 'email',
  portal: 'portal',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
}

const ROLE_PT: Record<string, string> = {
  primary_contact: 'Contacto Principal',
  cc: 'CC',
  vip: 'VIP',
  vendor: 'Fornecedor',
}

function eventLabel(event: TimelineEvent): string {
  if (event.type === 'checklist') {
    const who = event.member_name ? ` por ${event.member_name}` : ''
    return `"${event.item_title}" marcado como ${STATUS_PT[event.status] ?? event.status}${who}`
  }
  if (event.type === 'notification') {
    return `Notificação via ${CHANNEL_PT[event.channel] ?? event.channel} para ${event.client_name} — ${STATUS_PT[event.status] ?? event.status}`
  }
  const action = event.action === 'added' ? 'adicionado' : 'removido'
  return `${event.client_name} ${action} como ${ROLE_PT[event.role] ?? event.role}`
}

function EventIcon({ type }: { type: TimelineEvent['type'] }) {
  if (type === 'checklist') return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
  if (type === 'notification') return <Bell className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
  return <UserPlus className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
}

interface ActivityFeedProps {
  eventId: string
  initialEvents: TimelineEvent[]
}

export function ActivityFeed({ eventId, initialEvents }: ActivityFeedProps) {
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents)

  useEffect(() => {
    const supabase = createClient()

    function prependEvent(event: TimelineEvent) {
      setEvents(prev => [event, ...prev].slice(0, 30))
    }

    const channel = supabase
      .channel(`activity:${eventId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'event_checklist_items',
        filter: `event_id=eq.${eventId}`,
      }, (payload) => {
        const row = payload.new as { id: string; title: string; client_label: string | null; status: string; updated_at: string }
        prependEvent({
          type: 'checklist',
          id: row.id,
          item_title: row.client_label ?? row.title,
          status: row.status,
          member_name: null,
          timestamp: row.updated_at,
        })
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notification_jobs',
        filter: `event_id=eq.${eventId}`,
      }, (payload) => {
        const row = payload.new as { id: string; channel: string; status: string; created_at: string }
        prependEvent({
          type: 'notification',
          id: row.id,
          client_name: 'Cliente',
          channel: row.channel,
          status: row.status,
          timestamp: row.created_at,
        })
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'event_clients',
        filter: `event_id=eq.${eventId}`,
      }, (payload) => {
        const row = payload.new as { id: string; role: string; created_at: string }
        prependEvent({
          type: 'client',
          id: row.id,
          client_name: 'Cliente',
          action: 'added',
          role: row.role,
          timestamp: row.created_at,
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  if (!events.length) return null

  return (
    <div className="mt-6 bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <h2 className="text-sm font-semibold text-slate-700 mb-4">Atividade Recente</h2>
      <ul className="space-y-3">
        {events.map((event, idx) => (
          <li key={`${event.type}-${event.id}-${idx}`} className="flex gap-3">
            <EventIcon type={event.type} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700">{eventLabel(event)}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: pt })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
