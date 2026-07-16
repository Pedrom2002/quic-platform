import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CalendarDays, Newspaper, Images, FileText, ExternalLink, Download, MapPin } from 'lucide-react'

import { getArtistPortalData } from '@/lib/artists/portal-data'
import { agendaTypeLabels, assetKindLabels, formatDate, formatDateTime } from '@/lib/artists/format'
import type { ArtistAgendaType, ArtistAssetKind } from '@/types/app'
import type { ArtistAgendaItem, ArtistAsset } from '@/types/database'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const data = await getArtistPortalData(token)
  if (!data) return { title: 'Portal' }
  return {
    title: `${data.artist.name} · Portal`,
    robots: { index: false, follow: false },
  }
}

function downloadHref(token: string, asset: ArtistAsset): string {
  const name = encodeURIComponent(asset.title)
  return `/api/artist-portal/download?token=${encodeURIComponent(token)}&url=${encodeURIComponent(asset.blob_url ?? '')}&name=${name}`
}

function AgendaItem({ item }: { item: ArtistAgendaItem }) {
  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
          {agendaTypeLabels[item.type as ArtistAgendaType] ?? item.type}
        </span>
        <span className="text-xs text-zinc-400">{formatDateTime(item.starts_at)}</span>
      </div>
      <p className="mt-2 font-medium text-white">{item.title}</p>
      {item.location && (
        <p className="mt-1 flex items-center gap-1 text-sm text-zinc-400">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {item.location}
        </p>
      )}
      {item.notes && <p className="mt-1 text-sm text-zinc-500">{item.notes}</p>}
    </li>
  )
}

export default async function ArtistPortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await getArtistPortalData(token)
  if (!data) notFound()

  const { artist, upcoming, past, clippings, contents, documents } = data

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-zinc-200">
      {/* Header */}
      <header className="flex flex-col items-center gap-4 text-center">
        {artist.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artist.photo_url}
            alt={artist.name}
            className="h-24 w-24 rounded-full border border-zinc-700 object-cover"
          />
        ) : (
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-800 text-2xl font-semibold text-white">
            {artist.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="text-3xl font-semibold text-white">{artist.name}</h1>
          {artist.bio && <p className="mt-2 max-w-xl text-sm text-zinc-400">{artist.bio}</p>}
        </div>
      </header>

      {/* Agenda */}
      <section className="mt-12" aria-labelledby="agenda-heading">
        <h2 id="agenda-heading" className="flex items-center gap-2 text-lg font-semibold text-white">
          <CalendarDays className="h-5 w-5" aria-hidden="true" /> Agenda
        </h2>
        {upcoming.length === 0 && past.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Sem compromissos na agenda.</p>
        ) : (
          <>
            <ul className="mt-4 flex flex-col gap-3">
              {upcoming.map((item) => (
                <AgendaItem key={item.id} item={item} />
              ))}
              {upcoming.length === 0 && (
                <p className="text-sm text-zinc-500">Sem compromissos futuros.</p>
              )}
            </ul>
            {past.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-zinc-400 hover:text-zinc-200">
                  Passados ({past.length})
                </summary>
                <ul className="mt-3 flex flex-col gap-3 opacity-70">
                  {past.map((item) => (
                    <AgendaItem key={item.id} item={item} />
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </section>

      {/* Imprensa */}
      <section className="mt-12" aria-labelledby="imprensa-heading">
        <h2 id="imprensa-heading" className="flex items-center gap-2 text-lg font-semibold text-white">
          <Newspaper className="h-5 w-5" aria-hidden="true" /> Imprensa
        </h2>
        {clippings.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Sem artigos por agora.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {clippings.map((clipping) => (
              <li key={clipping.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <a
                  href={clipping.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-white underline-offset-2 hover:underline"
                >
                  {clipping.title}
                  <ExternalLink className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" />
                </a>
                <p className="mt-1 text-xs text-zinc-400">
                  {[clipping.source, clipping.published_at ? formatDate(clipping.published_at) : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Conteúdos */}
      <section className="mt-12" aria-labelledby="conteudos-heading">
        <h2 id="conteudos-heading" className="flex items-center gap-2 text-lg font-semibold text-white">
          <Images className="h-5 w-5" aria-hidden="true" /> Conteúdos
        </h2>
        {contents.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Sem conteúdos por agora.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contents.map((asset) => (
              <a
                key={asset.id}
                href={asset.external_url ?? downloadHref(token, asset)}
                target="_blank"
                rel="noopener noreferrer"
                className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60"
              >
                {asset.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.thumbnail_url}
                    alt={asset.title}
                    className="h-36 w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-36 w-full items-center justify-center bg-zinc-800 text-3xl">
                    {asset.kind === 'video' ? '🎬' : asset.kind === 'arte' ? '🎨' : '📄'}
                  </div>
                )}
                <div className="p-3">
                  <p className="text-sm font-medium text-white">{asset.title}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {assetKindLabels[asset.kind as ArtistAssetKind] ?? asset.kind}
                    {asset.external_url ? ' · link externo' : ''}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Documentos */}
      <section className="mt-12" aria-labelledby="documentos-heading">
        <h2 id="documentos-heading" className="flex items-center gap-2 text-lg font-semibold text-white">
          <FileText className="h-5 w-5" aria-hidden="true" /> Documentos
        </h2>
        {documents.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Sem documentos por agora.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{doc.title}</p>
                  <p className="text-xs text-zinc-400">
                    {assetKindLabels[doc.kind as ArtistAssetKind] ?? doc.kind} · {formatDate(doc.created_at)}
                  </p>
                </div>
                <a
                  href={doc.external_url ?? downloadHref(token, doc)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
                >
                  {doc.external_url ? (
                    <>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Abrir
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5" aria-hidden="true" /> Download
                    </>
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-16 border-t border-zinc-800 pt-6 text-center text-xs text-zinc-600">
        Este link é pessoal. Se precisares de algo, fala com a agência.
      </footer>
    </main>
  )
}
