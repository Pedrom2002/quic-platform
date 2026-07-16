import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { ArtistClipping } from '@/types/database'
import { formatDate } from '@/lib/artists/format'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { ClippingCreateDialog } from './clipping-create-dialog'
import { ClippingRowActions } from './clipping-row-actions'

export default async function ClippingPage({
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
    .from('artist_clippings')
    .select('*')
    .eq('artist_id', artistId)
    .order('published_at', { ascending: false, nullsFirst: false })
  const clippings = (data ?? []) as ArtistClipping[]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Artigos e notícias publicados sobre o artista.
        </p>
        <ClippingCreateDialog
          artistId={artist.id}
          notifyDefault={artist.notify_on_publish && Boolean(artist.email)}
          hasEmail={Boolean(artist.email)}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Fonte</TableHead>
            <TableHead>Link</TableHead>
            <TableHead className="w-24 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clippings.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Sem clipping.
              </TableCell>
            </TableRow>
          )}
          {clippings.map((clipping) => (
            <TableRow key={clipping.id}>
              <TableCell className="whitespace-nowrap">
                {clipping.published_at ? formatDate(clipping.published_at) : '-'}
              </TableCell>
              <TableCell className="font-medium">{clipping.title}</TableCell>
              <TableCell>
                {clipping.source ?? <span className="text-muted-foreground">-</span>}
              </TableCell>
              <TableCell>
                <a
                  href={clipping.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline underline-offset-2 hover:text-foreground"
                >
                  Abrir artigo
                </a>
              </TableCell>
              <TableCell className="text-right">
                <ClippingRowActions clipping={clipping} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
