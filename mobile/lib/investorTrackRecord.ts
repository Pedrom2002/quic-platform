import type { SupabaseClient } from '@supabase/supabase-js'

export interface InvestorTrackRecordProject {
  id: string
  name: string
  fundingGoalCents: number
  actualRevenueCents: number | null
  attendance: number | null
}

export interface InvestorTrackRecordSummary {
  completedCount: number
  totalRevenueCents: number
  totalAttendance: number
  projects: InvestorTrackRecordProject[]
}

interface InvestmentProjectRow {
  id: string
  name: string
  funding_goal_cents: number
  actual_revenue_cents: number | null
  attendance: number | null
  created_at: string
}

// Replica a query de app/investors/(gated)/track-record/page.tsx no runtime
// mobile (React Native não tem Server Components). Lista pública de
// projetos concluídos — não é escopada por investidor, mesmo padrão de
// fetchInvestorOpportunities.
export async function fetchInvestorTrackRecord(supabase: SupabaseClient): Promise<InvestorTrackRecordSummary> {
  const { data } = await supabase
    .from('investment_projects')
    .select('id, name, funding_goal_cents, actual_revenue_cents, attendance, created_at')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  const rows = (data ?? []) as unknown as InvestmentProjectRow[]

  const projects: InvestorTrackRecordProject[] = rows.map(row => ({
    id: row.id,
    name: row.name,
    fundingGoalCents: row.funding_goal_cents,
    actualRevenueCents: row.actual_revenue_cents,
    attendance: row.attendance,
  }))

  return {
    completedCount: projects.length,
    totalRevenueCents: projects.reduce((sum, p) => sum + (p.actualRevenueCents ?? 0), 0),
    totalAttendance: projects.reduce((sum, p) => sum + (p.attendance ?? 0), 0),
    projects,
  }
}
