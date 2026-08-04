'use client'

import { useState } from 'react'
import Image from 'next/image'

import type { ArtistPortalData } from '@/lib/artists/portal-data'
import { agendaTypeLabels, assetKindLabels, displayArtistName, formatDate, formatDateTime } from '@/lib/artists/format'
import type { ArtistAgendaType, ArtistAssetKind } from '@/types/app'
import type { ArtistAgendaItem, ArtistAsset, ArtistClipping } from '@/types/database'

const HERO_VIDEO = '/qp_1630-148614385.mp4'

interface Props {
  data: ArtistPortalData
  token: string
}

function downloadHref(token: string, asset: ArtistAsset): string {
  return `/api/artist-portal/download?token=${encodeURIComponent(token)}&url=${encodeURIComponent(asset.blob_url ?? '')}&name=${encodeURIComponent(asset.title)}`
}

type TabKey = 'agenda' | 'clipping' | 'contents' | 'documents'

function TabBar({
  active,
  hasClipping,
  hasContents,
  hasDocuments,
  onChange,
}: {
  active: TabKey
  hasClipping: boolean
  hasContents: boolean
  hasDocuments: boolean
  onChange: (tab: TabKey) => void
}) {
  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'agenda', label: 'Agenda' },
    ...(hasClipping ? [{ key: 'clipping' as const, label: 'Imprensa' }] : []),
    ...(hasContents ? [{ key: 'contents' as const, label: 'Conteúdos' }] : []),
    ...(hasDocuments ? [{ key: 'documents' as const, label: 'Documentos' }] : []),
  ]

  if (tabs.length < 2) return null

  return (
    <div className="border-b border-black/10">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 md:px-8 flex overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`px-4 py-3.5 text-xs font-semibold tracking-widest uppercase transition-colors border-b-2 whitespace-nowrap ${
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

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
      <h2 className="text-xs font-medium tracking-widest uppercase text-stone-900">{title}</h2>
      <span className="text-xs text-stone-400 tabular-nums">
        {String(count).padStart(2, '0')}
      </span>
    </div>
  )
}

function AgendaCard({ item }: { item: ArtistAgendaItem }) {
  return (
    <li className="bg-stone-50 border border-stone-100 rounded px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 border border-stone-200 px-2 py-0.5 rounded shrink-0">
          {agendaTypeLabels[item.type as ArtistAgendaType] ?? item.type}
        </span>
        <span className="text-xs text-stone-400 tabular-nums">{formatDateTime(item.starts_at)}</span>
      </div>
      <p className="text-sm font-medium text-stone-900 leading-snug mt-2">{item.title}</p>
      {item.location && <p className="text-xs text-stone-400 mt-1">{item.location}</p>}
      {item.notes && <p className="text-xs text-stone-400 italic mt-1.5 leading-relaxed">{item.notes}</p>}
    </li>
  )
}

function AgendaTab({ upcoming, past }: { upcoming: ArtistAgendaItem[]; past: ArtistAgendaItem[] }) {
  const [showPast, setShowPast] = useState(false)

  return (
    <div className="anim-tab-fade">
      <SectionHeader title="Próximos compromissos" count={upcoming.length} />
      {upcoming.length === 0 ? (
        <p className="text-sm text-stone-400">Sem compromissos futuros.</p>
      ) : (
        <ul className="space-y-4">
          {upcoming.map(item => <AgendaCard key={item.id} item={item} />)}
        </ul>
      )}

      {past.length > 0 && (
        <div className="mt-12">
          <button
            onClick={() => setShowPast(v => !v)}
            className="w-full flex items-baseline justify-between pb-4 border-b border-stone-200 text-left group"
          >
            <span className="text-xs font-medium tracking-widest uppercase text-stone-400 group-hover:text-stone-600 transition-colors">
              Passados {showPast ? '−' : '+'}
            </span>
            <span className="text-xs text-stone-400 tabular-nums">
              {String(past.length).padStart(2, '0')}
            </span>
          </button>
          {showPast && (
            <ul className="space-y-4 mt-6 opacity-70">
              {past.map(item => <AgendaCard key={item.id} item={item} />)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function ClippingTab({ clippings }: { clippings: ArtistClipping[] }) {
  return (
    <div className="anim-tab-fade">
      <SectionHeader title="Imprensa" count={clippings.length} />
      <ul className="space-y-4">
        {clippings.map(clipping => (
          <li key={clipping.id}>
            <a
              href={clipping.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-stone-50 border border-stone-100 rounded px-4 py-3 hover:border-stone-300 hover:bg-white transition-colors"
            >
              <p className="text-sm font-medium text-stone-900 group-hover:underline leading-snug">
                {clipping.title}
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                {clipping.source && <span className="text-xs text-stone-400">{clipping.source}</span>}
                {clipping.published_at && (
                  <span className="text-xs text-stone-300 tabular-nums">
                    {formatDate(clipping.published_at)}
                  </span>
                )}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ContentsTab({ contents, token }: { contents: ArtistAsset[]; token: string }) {
  return (
    <div className="anim-tab-fade">
      <SectionHeader title="Conteúdos" count={contents.length} />
      <div className="grid gap-4 sm:grid-cols-2">
        {contents.map(asset => (
          <a
            key={asset.id}
            href={asset.external_url ?? downloadHref(token, asset)}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-stone-50 border border-stone-100 rounded overflow-hidden hover:border-stone-300 transition-colors"
          >
            {asset.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={asset.thumbnail_url}
                alt={asset.title}
                className="w-full h-44 object-cover group-hover:opacity-90 transition-opacity"
              />
            ) : (
              <div className="w-full h-44 bg-stone-100 flex items-center justify-center text-3xl">
                {asset.kind === 'video' ? '🎬' : asset.kind === 'arte' ? '🎨' : '📄'}
              </div>
            )}
            <div className="px-4 py-3">
              <p className="text-sm font-medium text-stone-900 leading-snug group-hover:underline">
                {asset.title}
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-xs text-stone-400">
                  {assetKindLabels[asset.kind as ArtistAssetKind] ?? asset.kind}
                </span>
                <span className="text-xs text-stone-300 tabular-nums">{formatDate(asset.created_at)}</span>
                {asset.external_url && <span className="text-xs text-stone-300">link externo</span>}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

function DocumentsTab({ documents, token }: { documents: ArtistAsset[]; token: string }) {
  return (
    <div className="anim-tab-fade">
      <SectionHeader title="Documentos" count={documents.length} />
      <ul className="space-y-3">
        {documents.map(doc => (
          <li
            key={doc.id}
            className="flex items-center gap-3 bg-stone-50 border border-stone-100 rounded px-4 py-3"
          >
            <span className="text-stone-400 text-xs">📄</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-900 truncate">{doc.title}</p>
              <p className="text-xs text-stone-400 mt-0.5">
                {assetKindLabels[doc.kind as ArtistAssetKind] ?? doc.kind} · {formatDate(doc.created_at)}
              </p>
            </div>
            <a
              href={doc.external_url ?? downloadHref(token, doc)}
              target="_blank"
              rel="noopener noreferrer"
              download={doc.external_url ? undefined : doc.title}
              className="text-xs text-stone-400 border border-stone-200 px-2 py-1 rounded hover:border-stone-400 hover:text-stone-600 transition-colors shrink-0"
            >
              {doc.external_url ? '↗' : '↓'}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ArtistPortalClient({ data, token }: Props) {
  const { artist, upcoming, past, clippings, contents, documents } = data
  const [activeTab, setActiveTab] = useState<TabKey>('agenda')

  const nextItem = upcoming[0] ?? null

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes tab-fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-fade-up {
          opacity: 0;
          animation: fade-up 0.9s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .anim-tab-fade {
          animation: tab-fade 0.15s ease-out forwards;
        }
      `}</style>

      {/* Hero */}
      <section
        className="text-white relative overflow-hidden flex flex-col justify-between"
        style={{ height: '100dvh', background: 'linear-gradient(145deg, #0d0c0d 0%, #1a1a1a 50%, #0d0c0d 100%)' }}
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover opacity-[0.07] pointer-events-none"
          src={HERO_VIDEO}
        />

        {/* Top bar */}
        <div className="relative z-10 border-b border-white/10 anim-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="w-full max-w-5xl mx-auto px-5 sm:px-8 md:px-12 py-4 sm:py-5 flex items-center justify-between">
            <Image src="/logo-branco.png" alt="Quic" width={130} height={52} priority />
            <span className="text-xs font-medium tracking-widest uppercase text-white/70 border border-white/20 px-3 py-1">
              Portal do Artista
            </span>
          </div>
        </div>

        {/* Nome */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-5 sm:px-8 md:px-12 py-8 sm:py-12 flex-1 flex flex-col justify-center">
          <p className="text-xs font-medium tracking-[0.35em] uppercase text-white/40 mb-5 anim-fade-up" style={{ animationDelay: '350ms' }}>
            No Stage Is Too Big
          </p>

          <h1
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-8 break-words hyphens-auto anim-fade-up"
            style={{ animationDelay: '600ms', fontFamily: 'var(--font-playfair), Georgia, serif' }}
          >
            {displayArtistName(artist.name)}
          </h1>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-white/50 text-sm anim-fade-up" style={{ animationDelay: '850ms' }}>
            {artist.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={artist.photo_url}
                alt={artist.name}
                className="h-10 w-10 rounded-full border border-white/20 object-cover"
              />
            )}
            {artist.bio && <span className="max-w-xl leading-relaxed">{artist.bio}</span>}
          </div>
        </div>

        {/* Próximo compromisso */}
        <div className="relative z-10 border-t border-white/10 anim-fade-up" style={{ animationDelay: '1100ms' }}>
          <div className="w-full max-w-5xl mx-auto px-5 sm:px-8 md:px-12 py-6 sm:py-8">
            <span className="text-xs font-medium tracking-widest uppercase text-white/50">
              Próximo compromisso
            </span>
            {nextItem ? (
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mt-2">
                <span className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {formatDateTime(nextItem.starts_at)}
                </span>
                <span className="text-sm text-white/50">
                  {nextItem.title}
                  {nextItem.location ? ` · ${nextItem.location}` : ''}
                </span>
              </div>
            ) : (
              <p className="text-sm text-white/40 mt-2">Sem compromissos agendados.</p>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="relative bg-white">
        <TabBar
          active={activeTab}
          hasClipping={clippings.length > 0}
          hasContents={contents.length > 0}
          hasDocuments={documents.length > 0}
          onChange={setActiveTab}
        />
        <section className="relative z-10 w-full max-w-5xl mx-auto px-5 sm:px-8 md:px-12 py-12 sm:py-16 md:py-24">
          {activeTab === 'agenda' && <AgendaTab upcoming={upcoming} past={past} />}
          {activeTab === 'clipping' && <ClippingTab clippings={clippings} />}
          {activeTab === 'contents' && <ContentsTab contents={contents} token={token} />}
          {activeTab === 'documents' && <DocumentsTab documents={documents} token={token} />}
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
            <p className="text-[10px] tracking-[0.25em] uppercase text-white/40">
              Portal Exclusivo · Link Pessoal
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
