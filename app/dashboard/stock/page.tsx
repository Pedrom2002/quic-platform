import Link from 'next/link'
import type { Route } from 'next'

import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function StatCard({
  title,
  value,
  description,
  href,
}: {
  title: string
  value: number
  description: string
  href: string
}) {
  return (
    <Link href={href as Route} className="group">
      <Card className="transition-colors group-hover:bg-muted/50">
        <CardHeader>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums">
            {value}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  )
}

export default async function StockDashboardPage() {
  const supabase = await createClient()

  const [materialsResult, requestsResult, eventsResult, shortageResult] =
    await Promise.all([
      supabase
        .from('stock_materials')
        .select('*', { count: 'exact', head: true })
        .eq('active', true),
      supabase
        .from('stock_quote_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'novo'),
      supabase
        .from('stock_events')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'em_curso'),
      supabase
        .from('stock_material_availability')
        .select('*', { count: 'exact', head: true })
        .lte('disponivel', 0),
    ])

  // Fallback: se o count na view falhar, contar as linhas manualmente.
  let shortageCount = shortageResult.count
  if (shortageResult.error || shortageCount === null) {
    const { data } = await supabase
      .from('stock_material_availability')
      .select('material_id, disponivel')
    shortageCount = (data ?? []).filter(
      (row: { disponivel: number }) => row.disponivel <= 0
    ).length
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral do inventário, pedidos e eventos.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Materiais ativos"
          value={materialsResult.count ?? 0}
          description="Materiais disponíveis no inventário"
          href="/dashboard/stock/materiais"
        />
        <StatCard
          title="Pedidos novos"
          value={requestsResult.count ?? 0}
          description="Pedidos de orçamento por analisar"
          href="/dashboard/stock/pedidos"
        />
        <StatCard
          title="Eventos em curso"
          value={eventsResult.count ?? 0}
          description="Eventos com material fora do armazém"
          href="/dashboard/stock/eventos"
        />
        <StatCard
          title="Materiais em falta"
          value={shortageCount ?? 0}
          description="Materiais com disponibilidade igual ou abaixo de 0"
          href="/dashboard/stock/movimentos"
        />
      </div>
    </div>
  )
}
