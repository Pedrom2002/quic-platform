import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { Investor } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCents } from '@/lib/format-money'

const dateFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
}

export default async function GoldenCircleInvestorDetailPage({
  params,
}: {
  params: Promise<{ investorId: string }>
}) {
  const { investorId } = await params
  const supabase = await createClient()

  const { data } = await supabase.from('investors').select('*').eq('id', investorId).single()
  if (!data) notFound()
  const investor = data as Investor

  const { data: investmentsData } = await supabase
    .from('investments')
    .select('id, amount_cents, invested_at, status, projected_return_cents, realized_return_cents, investment_projects(name)')
    .eq('investor_id', investorId)
    .order('invested_at', { ascending: false })
  const investments = investmentsData ?? []

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{investor.full_name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>Email: {investor.email}</p>
          <p>Telefone: {investor.phone ?? '-'}</p>
          <div className="flex items-center gap-2">
            <span>Estado:</span>
            <Badge>{STATUS_LABELS[investor.status] ?? investor.status}</Badge>
          </div>
          {investor.approved_at && (
            <p>Aprovado em: {dateFormatter.format(new Date(investor.approved_at))}</p>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Investimentos</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Projeto</TableHead>
              <TableHead>Montante</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Retorno projetado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {investments.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Sem investimentos.
                </TableCell>
              </TableRow>
            )}
            {investments.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>{inv.investment_projects?.name ?? '-'}</TableCell>
                <TableCell>{formatCents(inv.amount_cents)}</TableCell>
                <TableCell>{dateFormatter.format(new Date(inv.invested_at))}</TableCell>
                <TableCell>{inv.status}</TableCell>
                <TableCell>
                  {inv.projected_return_cents != null ? formatCents(inv.projected_return_cents) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
