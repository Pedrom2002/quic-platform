import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { StockQuoteRequest } from '@/lib/stock/types'
import { formatDate, formatDateTime } from '@/lib/stock/format'
import { buildMailtoHref, type MailtoItem } from '@/lib/stock/mailto'
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

import { QuoteStatusSelect } from './quote-status-select'

type ItemRow = MailtoItem

export default async function PedidoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()

  const [{ data: requestData }, { data: itemsData }] = await Promise.all([
    supabase.from('stock_quote_requests').select('*').eq('id', id).single(),
    supabase
      .from('stock_quote_request_items')
      .select('*, stock_materials(name, unit)')
      .eq('request_id', id),
  ])

  if (!requestData) {
    notFound()
  }

  const request = requestData as StockQuoteRequest
  const items = (itemsData ?? []) as ItemRow[]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">
            Pedido de {request.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Submetido a {formatDateTime(request.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <QuoteStatusSelect requestId={request.id} status={request.status} />
          <ButtonLink href="/dashboard/stock/pedidos" variant="outline" size="sm">
            Voltar
          </ButtonLink>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contacto</CardTitle>
          <CardDescription>
            Dados de contacto e detalhes do pedido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="font-medium">{request.name}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">
                <a
                  href={`mailto:${request.email}`}
                  className="hover:underline"
                >
                  {request.email}
                </a>
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">Telefone</dt>
              <dd className="font-medium">
                {request.phone ?? (
                  <span className="text-muted-foreground">-</span>
                )}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">Data do evento</dt>
              <dd className="font-medium">{formatDate(request.event_date)}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <dt className="text-muted-foreground">Mensagem</dt>
              <dd className="max-w-prose whitespace-pre-wrap font-medium">
                {request.message ?? (
                  <span className="text-muted-foreground">-</span>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itens pedidos</CardTitle>
          <CardDescription>
            Materiais e quantidades selecionados no catálogo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-center text-muted-foreground"
                  >
                    Sem itens.
                  </TableCell>
                </TableRow>
              )}
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.stock_materials?.name ?? 'Material removido'}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.quantity} {item.stock_materials?.unit ?? 'un'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div>
        <ButtonLink href={buildMailtoHref(request, items)}>
          Responder por email
        </ButtonLink>
      </div>
    </div>
  )
}
