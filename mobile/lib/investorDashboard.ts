import type { SupabaseClient } from '@supabase/supabase-js'

export interface InvestorDashboardDistributionEntry {
  name: string
  amountCents: number
  percentage: number
}

export interface InvestorDashboardStats {
  investedCents: number
  activeProjects: number
  realizedReturnCents: number
  projectedReturnCents: number
  estimatedValueCents: number
  distribution: InvestorDashboardDistributionEntry[]
}

interface InvestmentRow {
  amount_cents: number
  project_id: string
  status: string
  realized_return_cents: number | null
  projected_return_cents: number | null
  investment_projects: { name: string } | null
}

// Replica a agregação de app/investors/(gated)/dashboard/actions.ts:getInvestorDashboardStats
// no runtime mobile (React Native não tem Server Actions/Server Components).
// RLS (investor_sees_own_investments, migration 0066) já restringe as linhas
// devolvidas ao próprio investidor mesmo sem este filtro explícito, mas o filtro
// por investor_id é mantido aqui como defesa em profundidade, mesmo padrão já
// usado nas Server Actions do web.
export async function fetchInvestorDashboardStats(
  supabase: SupabaseClient,
  investorId: string
): Promise<InvestorDashboardStats> {
  const { data } = await supabase
    .from('investments')
    .select('amount_cents, project_id, status, realized_return_cents, projected_return_cents, investment_projects(name)')
    .eq('investor_id', investorId)

  const rows = (data ?? []) as unknown as InvestmentRow[]
  const activeRows = rows.filter(r => r.status === 'active')

  const investedCents = activeRows.reduce((sum, r) => sum + r.amount_cents, 0)
  const projectedReturnCents = activeRows.reduce((sum, r) => sum + (r.projected_return_cents ?? 0), 0)

  const byProject = new Map<string, number>()
  for (const row of activeRows) {
    const name = row.investment_projects?.name ?? 'Projeto sem nome'
    byProject.set(name, (byProject.get(name) ?? 0) + row.amount_cents)
  }

  const distribution: InvestorDashboardDistributionEntry[] = Array.from(byProject.entries())
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
