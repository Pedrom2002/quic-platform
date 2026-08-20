'use server'

import { createClient } from '@/lib/supabase/server'

export type DashboardDistributionEntry = {
  name: string
  amountCents: number
  percentage: number
}

export type DashboardStats = {
  investedCents: number
  activeProjects: number
  realizedReturnCents: number
  projectedReturnCents: number
  estimatedValueCents: number
  distribution: DashboardDistributionEntry[]
}

const EMPTY_STATS: DashboardStats = {
  investedCents: 0,
  activeProjects: 0,
  realizedReturnCents: 0,
  projectedReturnCents: 0,
  estimatedValueCents: 0,
  distribution: [],
}

export async function getInvestorDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return EMPTY_STATS

  const { data } = await supabase
    .from('investments')
    .select('amount_cents, project_id, status, realized_return_cents, projected_return_cents, investment_projects(name)')

  const rows = data ?? []
  const activeRows = rows.filter(r => r.status === 'active')

  const investedCents = activeRows.reduce((sum, r) => sum + r.amount_cents, 0)
  const projectedReturnCents = activeRows.reduce((sum, r) => sum + (r.projected_return_cents ?? 0), 0)

  const byProject = new Map<string, number>()
  for (const row of activeRows) {
    const name = row.investment_projects?.name ?? 'Projeto sem nome'
    byProject.set(name, (byProject.get(name) ?? 0) + row.amount_cents)
  }

  const distribution: DashboardDistributionEntry[] = Array.from(byProject.entries())
    .map(([name, amountCents]) => ({
      name,
      amountCents,
      percentage: investedCents > 0 ? Math.round((amountCents / investedCents) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amountCents - a.amountCents)

  return {
    investedCents,
    activeProjects: new Set(activeRows.map(r => r.project_id)).size,
    realizedReturnCents: rows.reduce((sum, r) => sum + (r.realized_return_cents ?? 0), 0),
    projectedReturnCents,
    estimatedValueCents: investedCents + projectedReturnCents,
    distribution,
  }
}
