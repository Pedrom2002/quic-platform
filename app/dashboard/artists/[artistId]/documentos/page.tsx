import { notFound } from 'next/navigation'
import { ExternalLink, Download } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import type { ArtistAsset } from '@/types/database'
import { assetKindLabels, formatDate } from '@/lib/artists/format'
import type { ArtistAssetKind } from '@/types/app'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { AssetCreateDialog } from '../asset-create-dialog'
import { AssetDeleteButton } from '../asset-delete-button'

export default async function DocumentosPage({
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
    .eq('section', 'document')
    .order('created_at', { ascending: false })
  const documents = (data ?? []) as ArtistAsset[]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Contratos, riders, press kits e faturas do artista.
        </p>
        <AssetCreateDialog
          artistId={artist.id}
          section="document"
          notifyDefault={artist.notify_on_publish && Boolean(artist.email)}
          hasEmail={Boolean(artist.email)}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Ficheiro</TableHead>
            <TableHead className="w-16 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Sem documentos.
              </TableCell>
            </TableRow>
          )}
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="whitespace-nowrap">{formatDate(doc.created_at)}</TableCell>
              <TableCell className="font-medium">{doc.title}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {assetKindLabels[doc.kind as ArtistAssetKind] ?? doc.kind}
                </Badge>
              </TableCell>
              <TableCell>
                <a
                  href={doc.external_url ?? doc.blob_url ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm underline underline-offset-2"
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
              </TableCell>
              <TableCell className="text-right">
                <AssetDeleteButton asset={doc} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
