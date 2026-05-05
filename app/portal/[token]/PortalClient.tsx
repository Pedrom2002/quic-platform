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

function useCountUp(target: number, duration = 900, delay = 0): number {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    if (target === 0) { setDisplayed(0); return }
    let raf: number
    const timeout = setTimeout(() => {
      const start = performance.now()
      function step(now: number) {
        const t = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - t, 3)
        setDisplayed(Math.round(eased * target))
        if (t < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }, delay)
    return () => { clearTimeout(timeout); cancelAnimationFrame(raf) }
  }, [target, duration, delay])

  return displayed
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <span className="text-xs font-medium tracking-widest uppercase text-emerald-400 border border-emerald-400/40 px-3 py-1">
        Concluído
      </span>
    )
  }
  if (status === 'active') {
    return (
      <span className="text-xs font-medium tracking-widest uppercase text-white/70 border border-white/20 px-3 py-1">
        Em Curso
      </span>
    )
  }
  return (
    <span className="text-xs font-medium tracking-widest uppercase text-white/70 border border-white/20 px-3 py-1">
      Em Preparação
    </span>
  )
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
  const [animatingOut, setAnimatingOut] = useState<Set<string>>(new Set())
  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set())
  const [isConnected, setIsConnected] = useState(false)

  const displayedPercent = useCountUp(progress.percent, 2200, 1100)

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

          if (updated.status === 'completed') {
            setAnimatingOut(prev => new Set(prev).add(updated.id))

            setTimeout(() => {
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

              setAnimatingOut(prev => {
                const s = new Set(prev)
                s.delete(updated.id)
                return s
              })

              setJustCompleted(prev => new Set(prev).add(updated.id))

              setTimeout(() => {
                setJustCompleted(prev => {
                  const s = new Set(prev)
                  s.delete(updated.id)
                  return s
                })
              }, 700)
            }, 280)
          } else {
            setItems(prev => {
              const idx = prev.findIndex(i => i.id === updated.id)
              if (idx === -1) return prev
              const next = [...prev]
              next[idx] = { ...next[idx], ...updated }
              return next
            })
          }

          setLastUpdate(new Date())
        }
      )
      .subscribe((s) => {
        setIsConnected(s === 'SUBSCRIBED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  const completedItems = items.filter(i => i.status === 'completed')
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())

  const pendingItems = items.filter(i => i.status !== 'completed')

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(1.35); }
        }
        @keyframes pulse-green {
          0%, 100% { background-color: rgb(209 250 229); border-color: rgb(167 243 208); }
          50%      { background-color: rgb(167 243 208); border-color: rgb(110 231 183); }
        }
        .anim-fade-up {
          opacity: 0;
          animation: fade-up 0.9s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .anim-fade-in {
          opacity: 0;
          animation: fade-in 0.7s ease-out forwards;
        }
        .anim-pulse-green {
          animation: pulse-green 0.6s ease-in-out 1;
        }
        .anim-item-exit {
          opacity: 0;
          transform: translateY(-6px);
          transition: opacity 0.25s ease-out, transform 0.25s ease-out;
        }
        .anim-item-enter {
          opacity: 0;
          animation: fade-up 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}</style>

      {/* Hero */}
      <section className="min-h-screen bg-neutral-900 text-white relative overflow-hidden flex flex-col justify-between" style={{ background: 'linear-gradient(145deg, #111111 0%, #1a1a1a 50%, #0d0d0d 100%)' }}>
        <div className="w-full max-w-5xl mx-auto px-5 sm:px-8 md:px-12 pt-8 sm:pt-12 pb-16 sm:pb-24 md:pb-32">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-16 sm:mb-24 md:mb-32 anim-fade-up" style={{ animationDelay: '100ms' }}>
            <Image src="/logo-branco.png" alt="Quic" width={80} height={32} priority />
            <StatusBadge status={status} />
          </div>

          {/* Slogan */}
          <p className="text-xs font-medium tracking-[0.35em] uppercase text-white/40 mb-5 anim-fade-up" style={{ animationDelay: '350ms' }}>
            No Stage Is Too Big
          </p>

          {/* Event name */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-8 break-words hyphens-auto anim-fade-up" style={{ animationDelay: '600ms' }}>
            {eventName}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-white/50 text-sm anim-fade-up" style={{ animationDelay: '850ms' }}>
            <span>{eventDate}</span>
            {venueName && (
              <>
                <span className="w-px h-3 bg-white/20" />
                <span>{venueName}</span>
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="border-t border-white/10 anim-fade-up" style={{ animationDelay: '1100ms' }}>
          <div className="w-full max-w-5xl mx-auto px-5 sm:px-8 md:px-12 py-6 sm:py-8">
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-xs font-medium tracking-widest uppercase text-white/50">
                Progresso
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-bold tracking-tight">{displayedPercent}</span>
                <span className="text-sm text-white/50">%</span>
              </div>
            </div>
            <div className="h-px bg-white/10 overflow-hidden">
              <div
                className="h-full bg-white"
                style={{ width: `${displayedPercent}%`, transition: 'width 50ms linear' }}
              />
            </div>
            <p className="text-xs text-white/40 mt-3">
              {progress.completed} de {progress.total} etapas concluídas
            </p>
          </div>
        </div>
      </section>

      {/* Completed event celebration band */}
      {status === 'completed' && (
        <div className="border-y border-stone-100 anim-fade-up" style={{ animationDelay: '200ms' }}>
          <div className="w-full max-w-5xl mx-auto px-5 sm:px-8 md:px-12 py-12 sm:py-16">
            <p className="text-xs font-medium tracking-widest uppercase text-stone-400 mb-4">
              Evento concluído
            </p>
            <p className="text-7xl sm:text-8xl font-bold tracking-tight text-stone-900 leading-none mb-8">
              100%
            </p>
            <p className="text-stone-500 text-sm leading-relaxed max-w-sm">
              Obrigado por escolher a Quic.<br />
              Foi um prazer trabalhar convosco.
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <section className="w-full max-w-5xl mx-auto px-5 sm:px-8 md:px-12 py-12 sm:py-16 md:py-24">
        {completedItems.length > 0 && (
          <div className="mb-16 sm:mb-20 md:mb-24">
            <div className="flex items-baseline justify-between mb-8 sm:mb-10 pb-4 border-b border-stone-900">
              <h2 className="text-xs font-medium tracking-widest uppercase text-stone-900">
                Concluído
              </h2>
              <span className="text-xs text-stone-400 tabular-nums">
                {String(completedItems.length).padStart(2, '0')}
              </span>
            </div>
            <ul>
              {completedItems.map((item, idx) => {
                const isNew = justCompleted.has(item.id)
                return (
                  <li
                    key={item.id}
                    className={`flex flex-col sm:grid sm:grid-cols-[2rem_1fr_auto] gap-2 sm:gap-6 md:gap-10 py-5 sm:py-6 px-4 -mx-4 rounded-lg border last:border-0 mb-2 ${
                      isNew
                        ? 'anim-item-enter anim-pulse-green border-emerald-300'
                        : 'bg-emerald-100 border-emerald-300 anim-fade-in'
                    }`}
                    style={isNew ? undefined : { animationDelay: `${300 + idx * 40}ms` }}
                  >
                    <span className="text-xs text-stone-500 tabular-nums tracking-wider font-medium pt-0.5">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="text-stone-900 text-base sm:text-lg font-medium tracking-tight">
                        {item.client_label ?? item.title}
                      </p>
                      {item.completion_note && (
                        <p className="text-stone-500 text-sm mt-1.5 leading-relaxed anim-fade-in" style={{ animationDelay: isNew ? '150ms' : `${300 + idx * 40 + 150}ms` }}>
                          {item.completion_note}
                        </p>
                      )}
                    </div>
                    {item.completed_at && (
                      <span className="text-xs text-stone-400 tabular-nums whitespace-nowrap self-start sm:text-right">
                        {format(new Date(item.completed_at), "d MMM · HH'h'mm", { locale: pt })}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {pendingItems.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between mb-8 sm:mb-10 pb-4 border-b border-stone-200">
              <h2 className="text-xs font-medium tracking-widest uppercase text-stone-500">
                Em Preparação
              </h2>
              <span className="text-xs text-stone-500 tabular-nums">
                {String(pendingItems.length).padStart(2, '0')}
              </span>
            </div>
            <ul>
              {pendingItems.map((item, idx) => (
                <li
                  key={item.id}
                  className={`flex flex-col sm:grid sm:grid-cols-[2rem_1fr] gap-2 sm:gap-6 md:gap-10 py-5 sm:py-6 border-b border-stone-100 last:border-0 anim-fade-in ${
                    animatingOut.has(item.id) ? 'anim-item-exit' : ''
                  }`}
                  style={{ animationDelay: `${300 + idx * 40}ms` }}
                >
                  <span className="text-xs text-stone-400 tabular-nums tracking-wider font-medium pt-0.5">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <p className="text-stone-500 text-base sm:text-lg tracking-tight">
                    {item.client_label ?? item.title}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="text-white" style={{ background: 'linear-gradient(145deg, #111111 0%, #1a1a1a 50%, #0d0d0d 100%)' }}>
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-12 md:py-16">
          <p className="text-2xl md:text-4xl font-bold tracking-tight leading-tight mb-8">
            No stage is too big.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-4 pt-8 border-t border-white/10">
            <Image src="/logo-branco.png" alt="Quic" width={70} height={28} />
            <div className="flex items-center gap-2 justify-end">
              {isConnected ? (
                <>
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
                    style={{ animation: lastUpdate ? 'none' : 'pulse-dot 2s ease-in-out infinite' }}
                  />
                  <div className="text-right">
                    {lastUpdate ? (
                      <p className="text-[10px] text-white/40 tabular-nums">
                        Atualizado às {format(lastUpdate, "HH'h'mm", { locale: pt })}
                      </p>
                    ) : (
                      <p className="text-[10px] tracking-[0.2em] uppercase text-white/40">
                        Em direto
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-[10px] tracking-[0.25em] uppercase text-white/40">
                  Portal Exclusivo · Tempo Real
                </p>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
