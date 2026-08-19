import type { SupabaseClient } from '@supabase/supabase-js'

export interface InvestorOpportunity {
  id: string
  name: string
  description: string | null
  fundingGoalCents: number
  investmentDeadline: string | null
}

interface InvestmentProjectRow {
  id: string
  name: string
  description: string | null
  funding_goal_cents: number
  investment_deadline: string | null
}

// Replica a query de app/investors/(gated)/opportunities/page.tsx no runtime
// mobile (React Native não tem Server Components). Lista pública de
// oportunidades abertas do Golden Circle — não é escopada por investidor,
// por isso sem filtro adicional além de status='open'.
export async function fetchInvestorOpportunities(supabase: SupabaseClient): Promise<InvestorOpportunity[]> {
  const { data } = await supabase
    .from('investment_projects')
    .select('id, name, description, funding_goal_cents, investment_deadline')
    .eq('status', 'open')
    .order('investment_deadline', { ascending: true, nullsFirst: false })

  const rows = (data ?? []) as unknown as InvestmentProjectRow[]

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    fundingGoalCents: row.funding_goal_cents,
    investmentDeadline: row.investment_deadline,
  }))
}
