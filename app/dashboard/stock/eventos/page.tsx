import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import type { StockEvent } from '@/lib/stock/types'
import { formatDate } from '@/lib/stock/format'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { EventCreateDialog } from './event-create-dialog'
import { EventRowActions } from './event-row-actions'
import { EventStatusBadge } from './event-status-badge'

export default async function EventosPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('stock_events')
    .select('*')
    .order('starts_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  const events = (data ?? []) as StockEvent[]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Eventos</h1>
          <p className="text-sm text-muted-foreground">
            Eventos com saídas, devoluções e danos de material associados.
          </p>
        </div>
        <EventCreateDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Datas</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-40 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground"
              >
                Sem eventos.
              </TableCell>
            </TableRow>
          )}
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/dashboard/stock/eventos/${event.id}`}
                  className="hover:underline"
                >
                  {event.name}
                </Link>
              </TableCell>
              <TableCell>
                {event.client_name ?? (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {formatDate(event.starts_on)}
                {event.ends_on ? ` a ${formatDate(event.ends_on)}` : ''}
              </TableCell>
              <TableCell>
                <EventStatusBadge status={event.status} />
              </TableCell>
              <TableCell className="text-right">
                <EventRowActions event={event} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
