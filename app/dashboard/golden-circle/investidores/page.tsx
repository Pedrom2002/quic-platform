import Link from 'next/link'
import type { Route } from 'next'

import { createClient } from '@/lib/supabase/server'
import type { Investor } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { approveInvestor, rejectInvestor } from './actions'
import { PagePagination } from '@/components/ui/page-pagination'

const dateFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
}

const STATUS_VARIANTS: Record<string, 'outline' | 'default' | 'destructive'> = {
  pending: 'outline',
  approved: 'default',
  rejected: 'destructive',
}

const PAGE_SIZE = 30

export default async function GoldenCircleInvestorsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status, page: pageParam } = await searchParams
  const supabase = await createClient()

  const requestedPage = Number.parseInt(pageParam ?? '1', 10)
  const page = Number.isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('investors')
    .select('id, full_name, email, phone, status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, count } = await query
  const investors = (data ?? []) as unknown as Investor[]
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-1">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
          <Link
            key={s}
            href={(s === 'all' ? '/dashboard/golden-circle/investidores' : `/dashboard/golden-circle/investidores?status=${s}`) as Route}
            className="rounded-full border px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {s === 'all' ? 'Todos' : STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Registo</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {investors.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Sem investidores.
              </TableCell>
            </TableRow>
          )}
          {investors.map((investor) => (
            <TableRow key={investor.id}>
              <TableCell className="font-medium">
                <Link href={`/dashboard/golden-circle/investidores/${investor.id}` as Route} className="hover:underline">
                  {investor.full_name}
                </Link>
              </TableCell>
              <TableCell>{investor.email}</TableCell>
              <TableCell>{investor.phone ?? <span className="text-muted-foreground">-</span>}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[investor.status] ?? 'outline'}>
                  {STATUS_LABELS[investor.status] ?? investor.status}
                </Badge>
              </TableCell>
              <TableCell>{dateFormatter.format(new Date(investor.created_at))}</TableCell>
              <TableCell>
                {investor.status === 'pending' && (
                  <div className="flex gap-2">
                    <form action={async (formData: FormData) => { 'use server'; await approveInvestor(formData) }}>
                      <input type="hidden" name="id" value={investor.id} />
                      <Button type="submit" size="sm">Aprovar</Button>
                    </form>
                    <form action={async (formData: FormData) => { 'use server'; await rejectInvestor(formData) }}>
                      <input type="hidden" name="id" value={investor.id} />
                      <Button type="submit" size="sm" variant="outline">Rejeitar</Button>
                    </form>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <PagePagination
        basePath="/dashboard/golden-circle/investidores"
        params={{ status: status && status !== 'all' ? status : undefined }}
        page={page}
        totalPages={totalPages}
      />
    </div>
  )
}
