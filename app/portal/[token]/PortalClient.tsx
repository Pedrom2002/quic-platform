'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
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
      {/* Hero - Black */}
      <section className="bg-black text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 md:px-10 pt-10 pb-20 md:pt-14 md:pb-32">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-20 md:mb-32">
            <Image src="/logo branco (1).png" alt="Quic" width={90} height={36} priority />
            <span className="text-[10px] md:text-xs font-medium tracking-[0.25em] uppercase text-white/50">
              Em Preparação
            </span>
          </div>

          {/* Slogan */}
          <p className="text-[10px] md:text-xs font-medium tracking-[0.4em] uppercase text-white/40 mb-6">
            No Stage Is Too Big
          </p>

          {/* Event name - massive */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-8 md:mb-10 break-words">
            {eventName}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-white/60 text-sm">
            <span className="tracking-wide">{eventDate}</span>
            {venueName && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span className="tracking-wide">{venueName}</span>
              </>
            )}
          </div>
        </div>

        {/* Progress bar - bottom of hero */}
        <div className="border-t border-white/10">
          <div className="max-w-5xl mx-auto px-6 md:px-10 py-6 md:py-8">
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-[10px] md:text-xs font-medium tracking-[0.25em] uppercase text-white/50">
                Progresso
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl md:text-4xl font-bold tracking-tight">{progress.percent}</span>
                <span className="text-sm text-white/50">%</span>
              </div>
            </div>
            <div className="h-px bg-white/10 overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-1000 ease-out"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-xs text-white/40 mt-3 tracking-wide">
              {progress.completed} de {progress.total} etapas concluídas
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-5xl mx-auto px-6 md:px-10 py-16 md:py-24">
        {completedItems.length > 0 && (
          <div className="mb-20 md:mb-24">
            <div className="flex items-baseline justify-between mb-10 md:mb-12 pb-4 border-b border-stone-900">
              <h2 className="text-xs md:text-sm font-medium tracking-[0.3em] uppercase text-stone-900">
                Concluído
              </h2>
              <span className="text-xs text-stone-400 tabular-nums">
                {String(completedItems.length).padStart(2, '0')}
              </span>
            </div>
            <ul className="space-y-0">
              {completedItems.map((item, idx) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[auto_1fr_auto] gap-6 md:gap-10 py-6 md:py-7 border-b border-stone-100 last:border-0 items-baseline"
                >
                  <span className="text-xs text-stone-300 tabular-nums tracking-wider font-medium">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-stone-900 text-base md:text-lg font-medium tracking-tight">
                      {item.client_label ?? item.title}
                    </p>
                    {item.completion_note && (
                      <p className="text-stone-500 text-sm mt-1.5 leading-relaxed">{item.completion_note}</p>
                    )}
                  </div>
                  {item.completed_at && (
                    <span className="text-xs text-stone-400 tabular-nums whitespace-nowrap">
                      {format(new Date(item.completed_at), "d MMM · HH'h'mm", { locale: pt })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {pendingItems.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between mb-10 md:mb-12 pb-4 border-b border-stone-200">
              <h2 className="text-xs md:text-sm font-medium tracking-[0.3em] uppercase text-stone-400">
                Em Preparação
              </h2>
              <span className="text-xs text-stone-300 tabular-nums">
                {String(pendingItems.length).padStart(2, '0')}
              </span>
            </div>
            <ul className="space-y-0">
              {pendingItems.map((item, idx) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[auto_1fr] gap-6 md:gap-10 py-5 md:py-6 border-b border-stone-100 last:border-0 items-baseline"
                >
                  <span className="text-xs text-stone-200 tabular-nums tracking-wider font-medium">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <p className="text-stone-400 text-base md:text-lg tracking-tight">
                    {item.client_label ?? item.title}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-black text-white">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-12 md:py-16">
          <p className="text-2xl md:text-4xl font-bold tracking-tight leading-tight mb-8">
            No stage is too big.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-4 pt-8 border-t border-white/10">
            <Image src="/logo branco (1).png" alt="Quic" width={70} height={28} />
            <div className="text-right">
              <p className="text-[10px] tracking-[0.25em] uppercase text-white/40">
                Portal Exclusivo · Tempo Real
              </p>
              {lastUpdate && (
                <p className="text-[10px] text-white/30 mt-1 tabular-nums">
                  Atualizado · {format(lastUpdate, "HH'h'mm'min'ss's'", { locale: pt })}
                </p>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
