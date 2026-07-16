import { notFound } from 'next/navigation'
import { ExternalLink, Download } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import type { ArtistAsset } from '@/types/database'
import { assetKindLabels, formatDate } from '@/lib/artists/format'
import type { ArtistAssetKind } from '@/types/app'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

import { AssetCreateDialog } from '../asset-create-dialog'
import { AssetDeleteButton } from '../asset-delete-button'

export default async function ConteudosPage({
  params,
}: {
  params: Promise<{ artistId: string }>
}) {
  const { artistId } = await params
  const supabase = await createClient()

  const { data: artist } = await supabase
    .from('artists')
    .select('id, email, notify_on_publish')
    .eq('id', artistId)
    .single()
  if (!artist) notFound()

  const { data } = await supabase
    .from('artist_assets')
    .select('*')
    .eq('artist_id', artistId)
    .eq('section', 'content')
    .order('created_at', { ascending: false })
  const assets = (data ?? []) as ArtistAsset[]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Fotos, vídeos e artes criados para o artista.
        </p>
        <AssetCreateDialog
          artistId={artist.id}
          section="content"
          notifyDefault={artist.notify_on_publish && Boolean(artist.email)}
          hasEmail={Boolean(artist.email)}
        />
      </div>

      {assets.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Sem conteúdos.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden">
              {asset.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={asset.thumbnail_url}
                  alt={asset.title}
                  className="h-36 w-full object-cover"
                />
              ) : (
                <div className="flex h-36 w-full items-center justify-center bg-muted text-3xl">
                  {asset.kind === 'video' ? '🎬' : asset.kind === 'arte' ? '🎨' : '📄'}
                </div>
              )}
              <CardContent className="flex flex-col gap-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-tight">{asset.title}</p>
                  <AssetDeleteButton asset={asset} />
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">
                    {assetKindLabels[asset.kind as ArtistAssetKind] ?? asset.kind}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(asset.created_at)}
                  </span>
                </div>
                <a
                  href={asset.external_url ?? asset.blob_url ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs underline underline-offset-2"
                >
                  {asset.external_url ? (
                    <>
                      <ExternalLink className="h-3 w-3" aria-hidden="true" /> Abrir link
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3" aria-hidden="true" /> Abrir ficheiro
                    </>
                  )}
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
