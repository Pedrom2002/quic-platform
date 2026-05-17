'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { calcProgress } from '@/lib/event-status'
import type { PortalItem, PortalItemFile } from '@/lib/portal/data'

const FALLBACK_HERO_VIDEO = '/portal_hero.mp4'
const FALLBACK_CONTENT_VIDEO = '/portal_content.mp4'

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

function TabBar({
  active,
  hasDocuments,
  onChange,
}: {
  active: 'progress' | 'documents'
  hasDocuments: boolean
  onChange: (tab: 'progress' | 'documents') => void
}) {
  const tabs: Array<{ key: 'progress' | 'documents'; label: string }> = [
    { key: 'progress', label: 'Progresso' },
    ...(hasDocuments ? [{ key: 'documents' as const, label: 'Documentos' }] : []),
  ]

  if (tabs.length < 2) return null

  return (
    <div className="relative z-10 border-b border-white/10 backdrop-blur-md bg-white/5">
      <div className="w-full max-w-5xl mx-auto px-5 sm:px-8 md:px-12 flex">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`px-4 py-4 text-xs font-semibold tracking-widest uppercase transition-colors border-b-2 ${
              active === tab.key
                ? 'border-white text-white'
                : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
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

function ProgressTab({
  completedItems,
  pendingItems,
  animatingOut,
  justCompleted,
}: {
  completedItems: PortalItem[]
  pendingItems: PortalItem[]
  animatingOut: Set<string>
  justCompleted: Set<string>
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="anim-tab-fade">
      {completedItems.length > 0 && (
        <div className="mb-16 sm:mb-20 md:mb-24">
          <div className="flex items-baseline justify-between mb-10 pb-4 border-b border-white/12">
            <h2 className="text-xs font-medium tracking-widest uppercase text-white/40">
              Concluído
            </h2>
            <span className="text-xs text-white/25 tabular-nums">
              {String(completedItems.length).padStart(2, '0')}
            </span>
          </div>
          <ul>
            {completedItems.map((item, idx) => {
              const isNew = justCompleted.has(item.id)
              const hasContent = !!(item.completion_note || item.files.length > 0 || item.completed_at)
              const isExpanded = expandedIds.has(item.id)
              return (
                <li
                  key={item.id}
                  onClick={hasContent ? () => toggle(item.id) : undefined}
                  className={`relative border-b border-white/[0.06] last:border-b-0 overflow-hidden anim-fade-in ${
                    isNew ? 'anim-item-enter' : ''
                  } ${hasContent ? 'cursor-pointer' : ''}`}
                  style={isNew ? undefined : { animationDelay: `${300 + idx * 40}ms` }}
                >
                  <div className="flex gap-4 py-5">
                    <span className="text-base font-sans text-white/50 tabular-nums w-8 text-right shrink-0 self-start pt-0.5">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <p className="flex-1 text-white/90 text-sm font-medium tracking-tight leading-snug">
                          {item.client_label ?? item.title}
                        </p>
                        {item.completed_at && (
                          <span className="text-[10px] font-sans tracking-widest uppercase text-amber-400/70 shrink-0">
                            {format(new Date(item.completed_at), "d MMM", { locale: pt })}
                          </span>
                        )}
                        <span className="w-4 h-4 rounded-full border border-amber-400/50 flex items-center justify-center text-[7px] text-amber-400/80 shrink-0">✓</span>
                        {hasContent && (
                          <span className={`text-white/20 text-xs transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                        )}
                      </div>
                      {!isExpanded && item.files.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {item.files.slice(0, 3).map(file => file.mime_type?.startsWith('image/') && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={file.id} src={file.blob_url} alt="" className="w-10 h-10 rounded object-cover opacity-60" />
                          ))}
                          {item.files.length > 3 && (
                            <span className="w-10 h-10 rounded border border-white/10 flex items-center justify-center text-[10px] text-white/50 font-sans">
                              +{item.files.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      {isExpanded && (item.completion_note || item.files.length > 0) && (
                        <div className="pt-3 pb-2 space-y-3">
                          {item.completion_note && (
                            <p className="text-white/35 text-sm italic leading-relaxed">{item.completion_note}</p>
                          )}
                          {item.files.length > 0 && (
                            <div className="space-y-2">
                              {item.files.map(file => <FileRow key={file.id} file={file} />)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {pendingItems.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-10 pb-4 border-b border-white/[0.08]">
            <h2 className="text-xs font-medium tracking-widest uppercase text-white/25">
              Em Preparação
            </h2>
            <span className="text-xs text-white/20 tabular-nums">
              {String(pendingItems.length).padStart(2, '0')}
            </span>
          </div>
          <ul>
            {pendingItems.map((item, idx) => {
              const hasFiles = item.files.length > 0
              const isExpanded = expandedIds.has(item.id)
              return (
                <li
                  key={item.id}
                  onClick={hasFiles ? () => toggle(item.id) : undefined}
                  className={`border-b border-white/[0.05] last:border-0 overflow-hidden anim-fade-in ${
                    animatingOut.has(item.id) ? 'anim-item-exit' : ''
                  } ${hasFiles ? 'cursor-pointer' : ''}`}
                  style={{ animationDelay: `${300 + idx * 40}ms` }}
                >
                  <div className="flex items-center gap-4 py-4">
                    <span className="text-base font-sans text-white/50 tabular-nums w-8 text-right shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <p className="flex-1 text-white/55 text-sm tracking-tight leading-snug">
                      {item.client_label ?? item.title}
                    </p>
                    {(item.status === 'pending' || item.status === 'in_progress') && item.due_at && (
                      <span className="text-[10px] font-sans text-white/20 tabular-nums shrink-0">
                        {format(new Date(item.due_at), "d MMM", { locale: pt })}
                      </span>
                    )}
                    {hasFiles && (
                      <span className={`text-white/20 text-xs transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    )}
                  </div>
                  {isExpanded && hasFiles && (
                    <div className="pb-4 space-y-2">
                      {item.files.map(file => (
                        <FileRow key={file.id} file={file} />
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
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
}: Props) {
  const [items, setItems] = useState(initialItems)
  const [progress, setProgress] = useState(initialProgress)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [animatingOut, setAnimatingOut] = useState<Set<string>>(new Set())
  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set())
  const [isConnected, setIsConnected] = useState(false)
  const [activeTab, setActiveTab] = useState<'progress' | 'documents'>('progress')

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
        {heroVideo && (
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-[0.07] pointer-events-none"
            src={heroVideo}
          />
        )}
        {/* Top bar — full-width border */}
        <div className="relative z-10 border-b border-white/10 anim-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="w-full max-w-5xl mx-auto px-5 sm:px-8 md:px-12 py-4 sm:py-5 flex items-center justify-between">
            <Image src="/logo-quic.png" alt="Quic Vertex" width={200} height={80} priority />
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

      {/* Cross-fade bridge */}
      <div className="h-24 -mt-24 relative z-10 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, #111111)' }} />

      {/* Tab content */}
      <section className="relative" style={{ background: 'linear-gradient(145deg, #1c1c1c 0%, #242424 50%, #181818 100%)' }}>
        {contentVideo && (
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none"
            src={contentVideo}
          />
        )}
        <div className="absolute inset-0 pointer-events-none" />
        <TabBar
          active={activeTab}
          hasDocuments={eventFiles.length > 0}
          onChange={setActiveTab}
        />
        <section className="relative z-10 w-full max-w-5xl mx-auto px-5 sm:px-8 md:px-12 py-12 sm:py-16 md:py-24">
          {activeTab === 'progress' && (
            <ProgressTab
              completedItems={completedItems}
              pendingItems={pendingItems}
              animatingOut={animatingOut}
              justCompleted={justCompleted}
            />
          )}
          {activeTab === 'documents' && eventFiles.length > 0 && (
            <DocumentsTab files={eventFiles} />
          )}
        </section>
      </section>

      {/* Footer */}
      <footer className="text-white" style={{ background: 'linear-gradient(145deg, #1c1c1c 0%, #242424 50%, #181818 100%)' }}>
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 md:py-10">
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
            <div className="flex items-center gap-4">
              <Image src="/logo-quic.png" alt="Quic Vertex" width={200} height={80} />
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
