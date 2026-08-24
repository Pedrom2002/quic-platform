import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import type {
  StockMovement,
  StockMovementType,
  StockProfile,
} from '@/lib/stock/types'
import { formatDateTime } from '@/lib/stock/format'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { AdjustmentDialog } from './adjustment-dialog'
import { MovementsFilters } from './movements-filters'
import { MovementTypeBadge } from './movement-type-badge'

const MOVEMENT_TYPES: StockMovementType[] = [
  'saida',
  'entrada',
  'dano',
  'ajuste',
]
const LIMIT = 200

type MovementRow = StockMovement & {
  stock_materials: { name: string } | null
  stock_events: { name: string } | null
}

export default async function MovimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ material?: string; evento?: string; tipo?: string }>
}) {
  const params = await searchParams
  const materialId = params.material ?? ''
  const eventId = params.evento ?? ''
  const tipo = MOVEMENT_TYPES.includes(params.tipo as StockMovementType)
    ? (params.tipo as StockMovementType)
    : ''

  const supabase = await createClient()

  let movementsQuery = supabase
    .from('stock_movements')
    .select('*, stock_materials(name), stock_events(name)')
    .order('created_at', { ascending: false })
    .limit(LIMIT)
  if (materialId) {
    movementsQuery = movementsQuery.eq('material_id', materialId)
  }
  if (eventId) {
    movementsQuery = movementsQuery.eq('event_id', eventId)
  }
  if (tipo) {
    movementsQuery = movementsQuery.eq('type', tipo)
  }

  const [{ data: movementsData }, { data: materialsData }, { data: eventsData }] =
    await Promise.all([
      movementsQuery,
      supabase.from('stock_materials').select('id, name').order('name'),
      supabase
        .from('stock_events')
        .select('id, name')
        .order('created_at', { ascending: false }),
    ])

  const movements = (movementsData ?? []) as MovementRow[]
  const materials = (materialsData ?? []) as { id: string; name: string }[]
  const events = (eventsData ?? []) as { id: string; name: string }[]

  // Autor: stock_movements não tem FK para stock_profiles (uuid de user
  // partilhado). Recolher os created_by distintos e buscar os perfis numa
  // segunda query, depois juntar em memória.
  const authorIds = Array.from(
    new Set(
      movements
        .map((movement) => movement.created_by)
        .filter((id): id is string => Boolean(id))
    )
  )
  const authorMap = new Map<string, StockProfile>()
  if (authorIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('stock_profiles')
      .select('id, display_name, email, updated_at')
      .in('id', authorIds)
    for (const profile of (profilesData ?? []) as StockProfile[]) {
      authorMap.set(profile.id, profile)
    }
  }

  function authorLabel(createdBy: string | null): string {
    if (!createdBy) {
      return '-'
    }
    const profile = authorMap.get(createdBy)
    return profile?.display_name ?? profile?.email ?? '-'
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Movimentos</h1>
          <p className="text-sm text-slate-500">
            Ledger global de saídas, entradas, danos e ajustes.
          </p>
        </div>
        <AdjustmentDialog materials={materials} />
      </div>

      <MovementsFilters materials={materials} events={events} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Material</TableHead>
            <TableHead>Evento</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead>Autor</TableHead>
            <TableHead>Notas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center text-slate-500"
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
                {movement.event_id && movement.stock_events ? (
                  <Link
                    href={
                      `/dashboard/stock/eventos/${movement.event_id}` as import('next').Route
                    }
                    className="hover:underline"
                  >
                    {movement.stock_events.name}
                  </Link>
                ) : (
                  <span className="text-slate-500">-</span>
                )}
              </TableCell>
              <TableCell>
                <MovementTypeBadge type={movement.type} />
              </TableCell>
              <TableCell className="text-right">{movement.quantity}</TableCell>
              <TableCell className="text-slate-500">
                {authorLabel(movement.created_by)}
              </TableCell>
              <TableCell className="text-slate-500">
                {movement.notes ?? ''}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {movements.length === LIMIT && (
        <p className="text-sm text-slate-500">
          A mostrar os {LIMIT} movimentos mais recentes. Use os filtros para
          restringir os resultados.
        </p>
      )}
    </div>
  )
}
