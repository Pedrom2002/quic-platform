'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { calcProgress } from '@/lib/event-status'
import type { PortalItem, PortalItemFile, PortalArticle } from '@/lib/portal/data'

const FALLBACK_HERO_VIDEO = '/qp_1630-148614385.mp4'
const FALLBACK_CONTENT_VIDEO = ''

interface Props {
  eventId: string
  eventName: string
  venueName: string | null
  eventDate: string
  status: string
  initialItems: PortalItem[]
  initialProgress: { total: number; completed: number; percent: number }
  portalToken: string
  heroVideo: string | null
  contentVideo: string | null
  eventFiles: PortalItemFile[]
  articles: PortalArticle[]
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

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileRow({ file }: { file: PortalItemFile }) {
  const isImage = file.mime_type?.startsWith('image/') ?? false
  const isPdf = file.mime_type === 'application/pdf'
  const downloadHref = `/api/portal/download?url=${encodeURIComponent(file.blob_url)}&name=${encodeURIComponent(file.file_name)}`

  return (
    <div className="bg-stone-50 border border-stone-100 rounded overflow-hidden">
      {isImage && (
        <a href={file.blob_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={file.blob_url}
            alt={file.file_name}
            className="w-full max-h-64 object-cover hover:opacity-90 transition-opacity"
          />
        </a>
      )}
      {isPdf && (
        <a href={file.blob_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
          className="block group">
          <div className="w-full h-48 bg-stone-100 relative overflow-hidden">
            <iframe
              src={`${file.blob_url}#toolbar=0&navpanes=0&scrollbar=0`}
              className="w-full h-full border-0 pointer-events-none"
              title={file.file_name}
            />
            <div className="absolute inset-0 bg-transparent group-hover:bg-stone-900/5 transition-colors" />
            <span className="absolute bottom-2 right-2 text-[10px] bg-stone-900/70 text-white px-1.5 py-0.5 rounded">
              PDF
            </span>
          </div>
        </a>
      )}
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="text-stone-400 text-xs">{isImage ? '🖼' : isPdf ? '📄' : '📎'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-stone-700 text-sm font-medium truncate">{file.file_name}</p>
          {file.file_size !== null && (
            <p className="text-stone-400 text-xs">{formatFileSize(file.file_size)}</p>
          )}
        </div>
        <a
          href={downloadHref}
          download={file.file_name}
          onClick={e => e.stopPropagation()}
          className="text-xs text-stone-400 border border-stone-200 px-2 py-1 rounded hover:border-stone-400 hover:text-stone-600 transition-colors shrink-0"
        >
          ↓
        </a>
      </div>
    </div>
  )
}

type TabKey = 'progress' | 'clipping'

function TabBar({
  active,
  hasClipping,
  onChange,
}: {
  active: TabKey
  hasClipping: boolean
  onChange: (tab: TabKey) => void
}) {
  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'progress', label: 'Progresso' },
    ...(hasClipping ? [{ key: 'clipping' as const, label: 'Imprensa' }] : []),
  ]

  if (tabs.length < 2) return null

  return (
    <div className="border-b border-black/10">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 md:px-8 flex">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`px-4 py-3.5 text-xs font-semibold tracking-widest uppercase transition-colors border-b-2 ${
              active === tab.key
                ? 'border-black text-black'
                : 'border-transparent text-black/40 hover:text-black/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ClippingTab({ articles }: { articles: PortalArticle[] }) {
  return (
    <div className="anim-tab-fade">
      <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
        <h2 className="text-xs font-medium tracking-widest uppercase text-stone-900">
          Imprensa
        </h2>
        <span className="text-xs text-stone-400 tabular-nums">
          {String(articles.length).padStart(2, '0')}
        </span>
      </div>
      <ul className="space-y-4">
        {articles.map(article => (
          <li key={article.id}>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-stone-50 border border-stone-100 rounded px-4 py-3 hover:border-stone-300 hover:bg-white transition-colors"
            >
              <p className="text-sm font-medium text-stone-900 group-hover:underline leading-snug">
                {article.title}
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                {article.source && (
                  <span className="text-xs text-stone-400">{article.source}</span>
                )}
                <span className="text-xs text-stone-300 tabular-nums">
                  {format(new Date(article.created_at), "d MMM yyyy", { locale: pt })}
                </span>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DocumentsTab({ files }: { files: PortalItemFile[] }) {
  return (
    <div className="anim-tab-fade">
      <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
        <h2 className="text-xs font-medium tracking-widest uppercase text-stone-900">
          Documentos do Evento
        </h2>
        <span className="text-xs text-stone-400 tabular-nums">
          {String(files.length).padStart(2, '0')}
        </span>
      </div>
      <ul className="space-y-3">
        {files.map(file => (
          <li key={file.id}>
            <FileRow file={file} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function ItemRow({
  item,
  idx,
  animatingOut,
  justCompleted,
}: {
  item: PortalItem
  idx: number
  animatingOut: Set<string>
  justCompleted: Set<string>
}) {
  const [expanded, setExpanded] = useState(false)
  const isCompleted = item.status === 'completed'
  const isNew = justCompleted.has(item.id)
  const hasContent = !!(item.completion_note || item.files.length > 0)

  return (
    <li
      onClick={hasContent ? () => setExpanded(v => !v) : undefined}
      className={`group flex gap-4 py-4 border-b border-black/[0.06] last:border-b-0 overflow-hidden anim-fade-in ${
        isNew ? 'anim-item-enter' : ''
      } ${animatingOut.has(item.id) ? 'anim-item-exit' : ''} ${hasContent ? 'cursor-pointer' : ''}`}
      style={isNew ? undefined : { animationDelay: `${150 + idx * 30}ms` }}
    >
      {/* checkbox visual */}
      <div className="shrink-0 mt-0.5">
        {isCompleted ? (
          <span className="w-4 h-4 rounded-full border border-emerald-600 flex items-center justify-center text-[7px] text-emerald-700">✓</span>
        ) : (
          <span className="w-4 h-4 flex items-center justify-center text-black/40 group-hover:text-black/60 transition-colors text-[8px]">•</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <p className={`flex-1 text-sm tracking-tight leading-snug ${isCompleted ? 'text-black font-medium' : 'text-black/60'}`}>
            {item.client_label ?? item.title}
          </p>
          {hasContent && (
            <span className={`text-black/20 text-xs transition-transform duration-200 shrink-0 ${expanded ? 'rotate-90' : ''}`}>▶</span>
          )}
        </div>
        {expanded && (item.completion_note || item.files.length > 0) && (
          <div className="pt-3 pb-1 space-y-3">
            {item.completion_note && (
              <p className="text-black/35 text-sm italic leading-relaxed">{item.completion_note}</p>
            )}
            {item.files.length > 0 && (
              <div className="space-y-2">
                {item.files.map(file => <FileRow key={file.id} file={file} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

function CategorySection({
  category,
  items,
  animatingOut,
  justCompleted,
  initialOpen,
}: {
  category: string
  items: PortalItem[]
  animatingOut: Set<string>
  justCompleted: Set<string>
  initialOpen: boolean
}) {
  const [open, setOpen] = useState(initialOpen)
  const completed = items.filter(i => i.status === 'completed').length
  const total = items.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const allDone = completed === total

  return (
    <div className="border-b border-black/[0.08] last:border-b-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 py-3 text-left group"
      >
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold tracking-widest uppercase text-black/70 group-hover:text-black/90 transition-colors">{category}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
            allDone
              ? 'bg-emerald-500/20 text-emerald-700'
              : completed > 0
              ? 'bg-amber-400/20 text-amber-700'
              : 'bg-black/8 text-black/50'
          }`}>
            {completed}/{total}
          </span>
          <div className="hidden sm:block w-20 h-1 bg-black/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-400' : 'bg-amber-400/60'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`text-black/25 text-xs transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>▶</span>
        </div>
      </button>

      {open && (
        <ul className="pb-4">
          {items.map((item, idx) => (
            <ItemRow
              key={item.id}
              item={item}
              idx={idx}
              animatingOut={animatingOut}
              justCompleted={justCompleted}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function ProgressTab({
  items,
  animatingOut,
  justCompleted,
}: {
  items: PortalItem[]
  animatingOut: Set<string>
  justCompleted: Set<string>
}) {
  // derive ordered categories: items with category first (sorted alpha), then null -> "Geral"
  const categoryOrder = Array.from(
    new Set(items.map(i => i.category ?? 'Geral'))
  ).sort((a, b) => {
    if (a === 'Geral') return 1
    if (b === 'Geral') return -1
    return a.localeCompare(b, 'pt')
  })

  const grouped = new Map<string, PortalItem[]>()
  for (const cat of categoryOrder) grouped.set(cat, [])
  for (const item of items) {
    const key = item.category ?? 'Geral'
    grouped.get(key)!.push(item)
  }

  // if no categories at all (all null), fall back to flat list behaviour via single "Geral" group
  const hasCategories = items.some(i => i.category !== null)

  return (
    <div className="anim-tab-fade">
      {categoryOrder.map((cat, catIdx) => {
        const catItems = grouped.get(cat) ?? []
        if (!catItems.length) return null
        const hasCompleted = catItems.some(i => i.status === 'completed')
        return (
          <CategorySection
            key={cat}
            category={cat}
            items={catItems}
            animatingOut={animatingOut}
            justCompleted={justCompleted}
            initialOpen={false}
          />
        )
      })}
      {items.length === 0 && (
        <p className="text-black/20 text-sm text-center py-12">Sem etapas disponíveis.</p>
      )}
    </div>
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
  heroVideo,
  contentVideo,
  eventFiles,
  articles,
}: Props) {
  const resolvedHeroVideo = heroVideo ?? FALLBACK_HERO_VIDEO
  const resolvedContentVideo = contentVideo ?? FALLBACK_CONTENT_VIDEO

  const heroVideoRef = useRef<HTMLVideoElement>(null)
  const contentVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    heroVideoRef.current?.play().catch(() => {})
  }, [resolvedHeroVideo])

  useEffect(() => {
    contentVideoRef.current?.play().catch(() => {})
  }, [resolvedContentVideo])

  const [items, setItems] = useState(initialItems)
  const [progress, setProgress] = useState(initialProgress)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [animatingOut, setAnimatingOut] = useState<Set<string>>(new Set())
  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set())
  const [isConnected, setIsConnected] = useState(false)
  const [activeTab, setActiveTab] = useState<'progress' | 'clipping'>('progress')

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
        @keyframes pulse-gold {
          0%, 100% { border-color: rgba(180, 140, 60, 0.3); }
          50%      { border-color: rgba(180, 140, 60, 0.7); }
        }
        @keyframes tab-fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-fade-up {
          opacity: 0;
          animation: fade-up 0.9s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .anim-fade-in {
          opacity: 0;
          animation: fade-in 0.7s ease-out forwards;
        }
        .anim-pulse-gold {
          animation: pulse-gold 0.6s ease-in-out 1;
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
        .anim-tab-fade {
          animation: tab-fade 0.15s ease-out forwards;
        }
      `}</style>

      {/* Hero */}
      <section className="text-white relative overflow-hidden flex flex-col justify-between" style={{ height: '100dvh', background: 'linear-gradient(145deg, #111111 0%, #1a1a1a 50%, #0d0d0d 100%)' }}>
        {/* Background video */}
        {resolvedHeroVideo && (
          <video
            ref={heroVideoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onCanPlay={e => { e.currentTarget.play().catch(() => {}) }}
            onLoadedData={e => { e.currentTarget.play().catch(() => {}) }}
            className="absolute inset-0 w-full h-full object-cover opacity-[0.07] pointer-events-none"
            src={resolvedHeroVideo}
          />
        )}
        {/* Top bar — full-width border */}
        <div className="relative z-10 border-b border-white/10 anim-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="w-full max-w-5xl mx-auto px-5 sm:px-8 md:px-12 py-4 sm:py-5 flex items-center justify-between">
            <Image src="/logo-branco.png" alt="Quic" width={130} height={52} priority />
            <StatusBadge status={status} />
          </div>
        </div>

        <div className="relative z-10 w-full max-w-5xl mx-auto px-5 sm:px-8 md:px-12 py-8 sm:py-12 flex-1 flex flex-col justify-center">
          {/* Slogan */}
          <p className="text-xs font-medium tracking-[0.35em] uppercase text-white/40 mb-5 anim-fade-up" style={{ animationDelay: '350ms' }}>
            No Stage Is Too Big
          </p>

          {/* Event name */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-8 break-words hyphens-auto anim-fade-up" style={{ animationDelay: '600ms', fontFamily: 'var(--font-playfair), Georgia, serif' }}>
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
        <div className="relative z-10 border-t border-white/10 anim-fade-up" style={{ animationDelay: '1100ms' }}>
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
      <section className="relative bg-white">
        <TabBar
          active={activeTab}
          hasClipping={articles.length > 0}
          onChange={setActiveTab}
        />
        <section className="relative z-10 w-full max-w-5xl mx-auto px-5 sm:px-8 md:px-12 py-12 sm:py-16 md:py-24">
          {activeTab === 'progress' && (
            <ProgressTab
              items={items}
              animatingOut={animatingOut}
              justCompleted={justCompleted}
            />
          )}
          {activeTab === 'clipping' && (
            <ClippingTab articles={articles} />
          )}
        </section>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 text-white">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 md:py-10">
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
            <div className="flex items-center gap-4">
              <Image src="/logo-branco.png" alt="Quic" width={130} height={52} />
              <span className="text-xs tracking-[0.25em] uppercase text-white/30">No stage is too big</span>
            </div>
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
