'use server'

import { createClient } from '@/lib/supabase/server'

export type DashboardStats = {
  investedCents: number
  activeProjects: number
  realizedReturnCents: number
  projectedReturnCents: number
}

export async function getInvestorDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('investments')
    .select('amount_cents, project_id, status, realized_return_cents, projected_return_cents')

  const rows = data ?? []
  const activeRows = rows.filter(r => r.status === 'active')

  return {
    investedCents: activeRows.reduce((sum, r) => sum + r.amount_cents, 0),
    activeProjects: new Set(activeRows.map(r => r.project_id)).size,
    realizedReturnCents: rows.reduce((sum, r) => sum + (r.realized_return_cents ?? 0), 0),
    projectedReturnCents: activeRows.reduce((sum, r) => sum + (r.projected_return_cents ?? 0), 0),
  }
}
