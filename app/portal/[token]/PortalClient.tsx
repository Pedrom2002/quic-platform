'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Clock, MapPin } from 'lucide-react'
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-stone-100">
        <div className="max-w-xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <Image src="/logo preto.png" alt="Quic" width={80} height={32} />
            <span className="text-xs font-medium tracking-widest uppercase text-stone-400">
              {status === 'active' ? 'Em Preparação' : 'A Planear'}
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-stone-900 leading-tight">{eventName}</h1>

          <div className="flex items-center gap-5 mt-3 text-stone-400 text-sm">
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
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs tracking-widest uppercase text-stone-400 font-medium">Progresso</span>
              <span className="text-2xl font-bold text-stone-900">{progress.percent}%</span>
            </div>
            <div className="h-1 bg-stone-100 overflow-hidden">
              <div
                className="h-full bg-stone-900 transition-all duration-700 ease-out"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-xs text-stone-400 mt-2">
              {progress.completed} de {progress.total} etapas concluídas
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 py-10 space-y-10">
        {/* Etapas concluídas */}
        {completedItems.length > 0 && (
          <div>
            <p className="text-xs font-medium tracking-widest uppercase text-stone-400 mb-5">
              Concluído
            </p>
            <div className="space-y-px">
              {completedItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 py-4 border-b border-stone-100 last:border-0"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-stone-900 mt-2 shrink-0" />
                  <div className="flex-1">
                    <p className="text-stone-900 text-sm font-medium">
                      {item.client_label ?? item.title}
                    </p>
                    {item.completed_at && (
                      <p className="text-stone-400 text-xs mt-0.5">
                        {format(new Date(item.completed_at), "d MMM · HH'h'mm", { locale: pt })}
                      </p>
                    )}
                    {item.completion_note && (
                      <p className="text-stone-500 text-xs mt-1">{item.completion_note}</p>
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
            <p className="text-xs font-medium tracking-widest uppercase text-stone-400 mb-5">
              Em Preparação
            </p>
            <div className="space-y-px">
              {pendingItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 py-4 border-b border-stone-100 last:border-0"
                >
                  <div className="w-1.5 h-1.5 rounded-full border border-stone-300 shrink-0" />
                  <p className="text-stone-400 text-sm">{item.client_label ?? item.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-6 border-t border-stone-100">
          <p className="text-stone-300 text-xs">
            Portal exclusivo Quic · Atualizado em tempo real
          </p>
          {lastUpdate && (
            <p className="text-stone-200 text-xs mt-1">
              Última atualização: {format(lastUpdate, "HH'h'mm'min'ss's'", { locale: pt })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
