'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Circle, Clock, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { calcProgress } from '@/lib/event-status'
import type { PortalItem } from '@/lib/portal/data'

interface Props {
  eventId: string
  eventName: string
  venueName: string | null
  eventDate: string
  status: string
  initialItems: PortalItem[]
  initialProgress: { total: number; completed: number; percent: number }
  portalToken: string
}

export function PortalClient({
  eventId,
  eventName,
  venueName,
  eventDate,
  status,
  initialItems,
  initialProgress,
  portalToken,
}: Props) {
  const [items, setItems] = useState(initialItems)
  const [progress, setProgress] = useState(initialProgress)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`portal:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_checklist_items',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const updated = payload.new as PortalItem & { is_client_visible?: boolean }
          if (updated.is_client_visible === false) return

          setItems(prev => {
            const idx = prev.findIndex(i => i.id === updated.id)
            if (idx === -1) return prev
            const next = [...prev]
            next[idx] = { ...next[idx], ...updated }

            const total = next.length
            const completed = next.filter(i => i.status === 'completed').length
            setProgress({ total, completed, percent: calcProgress(completed, total) })

            return next
          })

          setLastUpdate(new Date())
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  const completedItems = items.filter(i => i.status === 'completed')
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())

  const pendingItems = items.filter(i => i.status !== 'completed')

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-900 font-bold text-lg">Quic</span>
            <div className={cn(
              'text-xs font-medium px-3 py-1 rounded-full',
              status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            )}>
              {status === 'active' ? 'Em Preparação' : 'A Planear'}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">{eventName}</h1>

          <div className="flex items-center gap-4 mt-2 text-slate-500 text-sm">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {eventDate}
            </span>
            {venueName && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {venueName}
              </span>
            )}
          </div>

          {/* Progress */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Progresso da preparação</span>
              <span className="text-sm font-bold text-slate-900">{progress.percent}%</span>
            </div>
            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              {progress.completed} de {progress.total} etapas concluídas
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {/* Etapas concluídas */}
        {completedItems.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Etapas Concluídas
            </h2>
            <div className="space-y-3">
              {completedItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-slate-800 text-sm font-medium">
                      {item.client_label ?? item.title}
                    </p>
                    {item.completed_at && (
                      <p className="text-slate-400 text-xs mt-0.5">
                        {format(new Date(item.completed_at), "d MMM · HH'h'mm", { locale: pt })}
                      </p>
                    )}
                    {item.completion_note && (
                      <p className="text-slate-500 text-xs mt-1 italic">{item.completion_note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Etapas em preparação */}
        {pendingItems.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Em Preparação
            </h2>
            <div className="space-y-2">
              {pendingItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl"
                >
                  <Circle className="w-5 h-5 text-slate-300 shrink-0" />
                  <p className="text-slate-500 text-sm">{item.client_label ?? item.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 border-t border-slate-200">
          <p className="text-slate-400 text-xs">
            Portal exclusivo Quic · Atualizado em tempo real
          </p>
          {lastUpdate && (
            <p className="text-slate-300 text-xs mt-1">
              Última atualização: {format(lastUpdate, "HH'h'mm'min'ss's'", { locale: pt })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
