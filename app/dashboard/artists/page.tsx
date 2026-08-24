import Link from 'next/link'
import type { Route } from 'next'
import { Mic2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import type { Artist } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'

import { ArtistCreateDialog } from './artist-create-dialog'

type ArtistWithCounts = Artist & {
  artist_agenda_items: { count: number }[]
  artist_clippings: { count: number }[]
  artist_assets: { count: number }[]
}

const countOf = (rows: { count: number }[]) => rows[0]?.count ?? 0

export default async function ArtistsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('artists')
    .select('*, artist_agenda_items(count), artist_clippings(count), artist_assets(count)')
    .order('created_at', { ascending: false })
  const artists = (data ?? []) as unknown as ArtistWithCounts[]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">Artistas</h1>
          <p className="text-sm text-slate-500">
            Artistas agenciados: agenda, imprensa, conteúdos e documentos partilhados no portal de cada um.
          </p>
        </div>
        <ArtistCreateDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Artista</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Agenda</TableHead>
            <TableHead>Clipping</TableHead>
            <TableHead>Conteúdos + Docs</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {artists.length === 0 && (
            <TableRow>
              <TableCell colSpan={6}>
                <EmptyState icon={Mic2} message="Sem artistas. Cria o primeiro." />
              </TableCell>
            </TableRow>
          )}
          {artists.map((artist) => (
            <TableRow key={artist.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/dashboard/artists/${artist.id}` as Route}
                  className="flex items-center gap-3 hover:underline"
                >
                  {artist.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={artist.photo_url}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold">
                      {artist.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  {artist.name}
                </Link>
              </TableCell>
              <TableCell>
                {artist.email ?? <span className="text-slate-500">-</span>}
              </TableCell>
              <TableCell>{countOf(artist.artist_agenda_items)}</TableCell>
              <TableCell>{countOf(artist.artist_clippings)}</TableCell>
              <TableCell>{countOf(artist.artist_assets)}</TableCell>
              <TableCell>
                <Badge variant={artist.is_active ? 'default' : 'secondary'}>
                  {artist.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
