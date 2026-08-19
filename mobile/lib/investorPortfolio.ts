import type { SupabaseClient } from '@supabase/supabase-js'

export interface InvestorPortfolioRow {
  id: string
  projectName: string
  projectStatus: string | null
  amountCents: number
  returnPercentage: number | null
  investmentStatus: string
}

export interface InvestorPortfolioSummary {
  totalCents: number
  investmentCount: number
  activeCount: number
  rows: InvestorPortfolioRow[]
}

interface InvestmentRow {
  id: string
  amount_cents: number
  status: string
  projected_return_cents: number | null
  investment_projects: { name: string; status: string } | null
}

// Replica a query de app/investors/(gated)/portfolio/page.tsx no runtime
// mobile (React Native não tem Server Components). RLS já restringe as
// linhas ao próprio investidor mesmo sem este filtro explícito, mas o
// filtro por investor_id é mantido como defesa em profundidade, mesmo
// padrão já usado em fetchInvestorDashboardStats.
export async function fetchInvestorPortfolio(
  supabase: SupabaseClient,
  investorId: string
): Promise<InvestorPortfolioSummary> {
  const { data } = await supabase
    .from('investments')
    .select('id, amount_cents, status, projected_return_cents, investment_projects(name, status)')
    .eq('investor_id', investorId)
    .order('invested_at', { ascending: false })

  const rawRows = (data ?? []) as unknown as InvestmentRow[]

  const rows: InvestorPortfolioRow[] = rawRows.map(row => ({
    id: row.id,
    projectName: row.investment_projects?.name ?? 'Projeto sem nome',
    projectStatus: row.investment_projects?.status ?? null,
    amountCents: row.amount_cents,
    returnPercentage:
      row.projected_return_cents != null && row.amount_cents > 0
        ? (row.projected_return_cents / row.amount_cents) * 100
        : null,
    investmentStatus: row.status,
  }))

  return {
    totalCents: rows.reduce((sum, r) => sum + r.amountCents, 0),
    investmentCount: rows.length,
    activeCount: rows.filter(r => r.investmentStatus === 'active').length,
    rows,
  }
}
