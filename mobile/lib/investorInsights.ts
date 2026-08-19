import type { SupabaseClient } from '@supabase/supabase-js'

export interface InvestorInsightsBreakdown {
  status: string
  count: number
  totalCents: number
  percentage: number
}

interface InvestmentRow {
  amount_cents: number
  status: string
}

const STATUS_ORDER = ['active', 'returned', 'written_off'] as const

// Replica aggregateByStatus de app/investors/(gated)/insights/page.tsx no
// runtime mobile (React Native não tem Server Components). Ao contrário da
// web (que confia só na RLS investor_sees_own_investments), filtra
// explicitamente por investor_id como defesa em profundidade, mesmo padrão
// já usado em fetchInvestorDashboardStats/fetchInvestorPortfolio.
export async function fetchInvestorInsights(
  supabase: SupabaseClient,
  investorId: string
): Promise<InvestorInsightsBreakdown[]> {
  const { data } = await supabase
    .from('investments')
    .select('amount_cents, status')
    .eq('investor_id', investorId)

  const rows = (data ?? []) as unknown as InvestmentRow[]
  const grandTotalCents = rows.reduce((sum, r) => sum + r.amount_cents, 0)

  return STATUS_ORDER.map(status => {
    const matching = rows.filter(r => r.status === status)
    const totalCents = matching.reduce((sum, r) => sum + r.amount_cents, 0)
    const percentage = grandTotalCents > 0 ? (totalCents / grandTotalCents) * 100 : 0

    return {
      status,
      count: matching.length,
      totalCents,
      percentage,
    }
  })
}
