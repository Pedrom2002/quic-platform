import Link from 'next/link'
import type { Route } from 'next'
import { Users, Clock, Wallet, TrendingUp } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { formatCents } from '@/lib/format-money'

export default async function GoldenCircleOverviewPage() {
  const supabase = await createClient()

  const [
    { count: approvedCount },
    { count: pendingCount },
    { data: investmentRows },
    { count: activeProjectCount },
  ] = await Promise.all([
    supabase.from('investors').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('investors').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('investments').select('amount_cents'),
    supabase.from('investment_projects').select('id', { count: 'exact', head: true }).in('status', ['open', 'coming_soon']),
  ])

  const totalInvestedCents = (investmentRows ?? []).reduce((sum, row) => sum + row.amount_cents, 0)

  const stats = [
    { label: 'Investidores aprovados', value: String(approvedCount ?? 0), icon: Users },
    { label: 'Aprovações pendentes', value: String(pendingCount ?? 0), icon: Clock },
    { label: 'Capital investido', value: formatCents(totalInvestedCents), icon: Wallet },
    { label: 'Projetos ativos', value: String(activeProjectCount ?? 0), icon: TrendingUp },
  ]

  const shortcuts = [
    { href: '/dashboard/golden-circle/investidores', label: 'Investidores', caption: `${approvedCount ?? 0} aprovados · ${pendingCount ?? 0} pendentes` },
    { href: '/dashboard/golden-circle/projetos', label: 'Projetos', caption: `${activeProjectCount ?? 0} ativos` },
    { href: '/dashboard/golden-circle/documentos', label: 'Documentos', caption: 'Contratos, relatórios e ficheiros' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="border border-zinc-200 bg-zinc-50 rounded-lg p-5">
            <stat.icon className="w-4 h-4 text-zinc-400 mb-3" />
            <p className="text-2xl font-semibold text-zinc-900 mb-1">{stat.value}</p>
            <p className="text-sm text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-base font-semibold text-zinc-900 mb-4">Gerir</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {shortcuts.map(shortcut => (
            <Link
              key={shortcut.href}
              href={shortcut.href as Route}
              className="border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 rounded-lg p-5 transition-colors"
            >
              <p className="text-base font-medium text-zinc-900 mb-1">{shortcut.label}</p>
              <p className="text-sm text-zinc-500">{shortcut.caption}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
