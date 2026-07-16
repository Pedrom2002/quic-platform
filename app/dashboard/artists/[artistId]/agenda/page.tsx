import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { ArtistAgendaItem } from '@/types/database'
import { agendaTypeLabels, formatDateTime } from '@/lib/artists/format'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { AgendaCreateDialog } from './agenda-create-dialog'
import { AgendaRowActions } from './agenda-row-actions'

export default async function AgendaPage({
  params,
}: {
  params: Promise<{ artistId: string }>
}) {
  const { artistId } = await params
  const supabase = await createClient()

  const { data: artist } = await supabase
    .from('artists')
    .select('id, name, email, notify_on_publish')
    .eq('id', artistId)
    .single()
  if (!artist) notFound()

  const [{ data: itemsRaw }, { data: eventsRaw }] = await Promise.all([
    supabase
      .from('artist_agenda_items')
      .select('*')
      .eq('artist_id', artistId)
      .order('starts_at', { ascending: false }),
    supabase
      .from('events')
      .select('id, name')
      .order('start_datetime', { ascending: false })
      .limit(50),
  ])
  const items = (itemsRaw ?? []) as ArtistAgendaItem[]
  const events = (eventsRaw ?? []) as { id: string; name: string }[]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Espetáculos, ensaios, entrevistas e outros compromissos do artista.
        </p>
        <AgendaCreateDialog
          artistId={artist.id}
          events={events}
          notifyDefault={artist.notify_on_publish && Boolean(artist.email)}
          hasEmail={Boolean(artist.email)}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Local</TableHead>
            <TableHead>Visível</TableHead>
            <TableHead className="w-32 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Agenda vazia.
              </TableCell>
            </TableRow>
          )}
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="whitespace-nowrap">{formatDateTime(item.starts_at)}</TableCell>
              <TableCell>
                <Badge variant="outline">{agendaTypeLabels[item.type as keyof typeof agendaTypeLabels] ?? item.type}</Badge>
              </TableCell>
              <TableCell className="font-medium">{item.title}</TableCell>
              <TableCell>{item.location ?? <span className="text-muted-foreground">-</span>}</TableCell>
              <TableCell>
                <Badge variant={item.is_visible ? 'default' : 'secondary'}>
                  {item.is_visible ? 'Sim' : 'Não'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <AgendaRowActions item={item} events={events} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
