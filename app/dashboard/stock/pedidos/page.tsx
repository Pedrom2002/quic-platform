import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import type { StockQuoteRequest, StockQuoteRequestStatus } from '@/lib/stock/types'
import { formatDate, formatDateTime } from '@/lib/stock/format'
import { ButtonLink } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { QuoteStatusBadge } from './quote-status-badge'
import { RequestsFilters } from './requests-filters'

const QUOTE_STATUSES: StockQuoteRequestStatus[] = [
  'novo',
  'em_analise',
  'respondido',
  'fechado',
]

type RequestRow = StockQuoteRequest & {
  stock_quote_request_items: { count: number }[]
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const params = await searchParams
  const estado = QUOTE_STATUSES.includes(
    params.estado as StockQuoteRequestStatus
  )
    ? (params.estado as StockQuoteRequestStatus)
    : ''

  const supabase = await createClient()

  let requestsQuery = supabase
    .from('stock_quote_requests')
    .select('*, stock_quote_request_items(count)')
    .order('created_at', { ascending: false })
  if (estado) {
    requestsQuery = requestsQuery.eq('status', estado)
  }

  const { data } = await requestsQuery
  const requests = (data ?? []) as RequestRow[]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <p className="text-sm text-muted-foreground">
          Pedidos de orçamento submetidos através do catálogo público.
        </p>
      </div>

      <RequestsFilters />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Data do evento</TableHead>
            <TableHead className="text-right">Nº itens</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-24 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center text-muted-foreground"
              >
                Sem pedidos.
              </TableCell>
            </TableRow>
          )}
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>{formatDateTime(request.created_at)}</TableCell>
              <TableCell className="font-medium">
                <Link
                  href={`/dashboard/stock/pedidos/${request.id}`}
                  className="hover:underline"
                >
                  {request.name}
                </Link>
              </TableCell>
              <TableCell>{request.email}</TableCell>
              <TableCell>{formatDate(request.event_date)}</TableCell>
              <TableCell className="text-right">
                {request.stock_quote_request_items[0]?.count ?? 0}
              </TableCell>
              <TableCell>
                <QuoteStatusBadge status={request.status} />
              </TableCell>
              <TableCell className="text-right">
                <ButtonLink
                  href={`/dashboard/stock/pedidos/${request.id}`}
                  variant="outline"
                  size="sm"
                >
                  Ver
                </ButtonLink>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
