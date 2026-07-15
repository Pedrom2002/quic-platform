import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { StockEvent, StockMovement } from '@/lib/stock/types'
import { formatDate, formatDateTime } from '@/lib/stock/format'
import { ButtonLink } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { MovementTypeBadge } from '../../movimentos/movement-type-badge'
import { EventStatusSelect } from './event-status-select'
import { MovementForm, type MaterialOption } from './movement-form'

type MovementRow = StockMovement & {
  stock_materials: { name: string; unit: string } | null
}

export default async function EventoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()

  const [
    { data: eventData },
    { data: materialsData },
    { data: availabilityData },
    { data: movementsData },
  ] = await Promise.all([
    supabase.from('stock_events').select('*').eq('id', id).single(),
    supabase
      .from('stock_materials')
      .select('id, name, unit')
      .eq('active', true)
      .order('name'),
    supabase.from('stock_material_availability').select('*'),
    supabase
      .from('stock_movements')
      .select('*, stock_materials(name, unit)')
      .eq('event_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!eventData) {
    notFound()
  }

  const event = eventData as StockEvent
  const movements = (movementsData ?? []) as MovementRow[]

  const availability = new Map<string, number>(
    (availabilityData ?? []).map(
      (row: { material_id: string; disponivel: number }) => [
        row.material_id,
        row.disponivel,
      ]
    )
  )

  const materials: MaterialOption[] = (
    (materialsData ?? []) as { id: string; name: string; unit: string }[]
  ).map((material) => ({
    ...material,
    disponivel: availability.get(material.id) ?? 0,
  }))

  // "Ainda fora" = saídas - entradas por material DESTE evento. A entrada é o
  // total que voltou fisicamente (incluindo unidades danificadas); o dano é
  // registado à parte e não conta para o que está fora.
  const outstanding = new Map<string, { name: string; unit: string; qty: number }>()
  for (const movement of movements) {
    if (movement.type !== 'saida' && movement.type !== 'entrada') {
      continue
    }
    const entry = outstanding.get(movement.material_id) ?? {
      name: movement.stock_materials?.name ?? 'Material removido',
      unit: movement.stock_materials?.unit ?? 'un',
      qty: 0,
    }
    entry.qty += movement.type === 'saida' ? movement.quantity : -movement.quantity
    outstanding.set(movement.material_id, entry)
  }
  const outstandingRows = [...outstanding.values()]
    .filter((entry) => entry.qty > 0)
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">{event.name}</h1>
          <p className="text-sm text-muted-foreground">
            {event.client_name ? `${event.client_name} · ` : ''}
            {formatDate(event.starts_on)}
            {event.ends_on ? ` a ${formatDate(event.ends_on)}` : ''}
          </p>
          {event.notes && (
            <p className="max-w-prose text-sm text-muted-foreground">
              {event.notes}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <EventStatusSelect eventId={event.id} status={event.status} />
          <ButtonLink href="/dashboard/stock/eventos" variant="outline" size="sm">
            Voltar
          </ButtonLink>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registar movimento</CardTitle>
          <CardDescription>
            Saída de material, devolução (entrada com o total que voltou
            fisicamente, incluindo unidades danificadas) ou dano (registado à
            parte).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MovementForm eventId={event.id} materials={materials} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ainda fora</CardTitle>
          <CardDescription>
            Material que saiu para este evento e ainda não foi devolvido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {outstandingRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum material por devolver.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Quantidade fora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outstandingRows.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right">
                      {row.qty} {row.unit}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimentos do evento</CardTitle>
          <CardDescription>
            Histórico de movimentos associados a este evento, do mais recente
            para o mais antigo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    Sem movimentos.
                  </TableCell>
                </TableRow>
              )}
              {movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>{formatDateTime(movement.created_at)}</TableCell>
                  <TableCell className="font-medium">
                    {movement.stock_materials?.name ?? 'Material removido'}
                  </TableCell>
                  <TableCell>
                    <MovementTypeBadge type={movement.type} />
                  </TableCell>
                  <TableCell className="text-right">
                    {movement.quantity}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {movement.notes ?? ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
