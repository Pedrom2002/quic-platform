// mobile/lib/investorDashboard.test.ts
import { describe, it, expect, jest } from '@jest/globals'
import { fetchInvestorDashboardStats } from './investorDashboard'

describe('fetchInvestorDashboardStats', () => {
  function makeSupabase(rows: Array<{
    amount_cents: number
    project_id: string
    status: string
    realized_return_cents: number | null
    projected_return_cents: number | null
    investment_projects: { name: string } | null
  }>) {
    const eq = jest.fn<() => Promise<{ data: unknown; error: unknown }>>().mockResolvedValue({ data: rows, error: null })
    const select = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ select }))
    return { from, select, eq } as any
  }

  it('returns zeroed stats and empty distribution when investor has no investments', async () => {
    const supabase = makeSupabase([])
    const stats = await fetchInvestorDashboardStats(supabase, 'investor-1')

    expect(stats).toEqual({
      investedCents: 0,
      activeProjects: 0,
      realizedReturnCents: 0,
      projectedReturnCents: 0,
      estimatedValueCents: 0,
      distribution: [],
    })
  })

  it('aggregates active investments only for invested amount and project count', async () => {
    const supabase = makeSupabase([
      { amount_cents: 100_000, project_id: 'proj-1', status: 'active', realized_return_cents: null, projected_return_cents: 5_000, investment_projects: { name: 'Projeto A' } },
      { amount_cents: 50_000, project_id: 'proj-2', status: 'active', realized_return_cents: null, projected_return_cents: 2_000, investment_projects: { name: 'Projeto B' } },
      { amount_cents: 30_000, project_id: 'proj-3', status: 'returned', realized_return_cents: 35_000, projected_return_cents: null, investment_projects: { name: 'Projeto C' } },
    ])
    const stats = await fetchInvestorDashboardStats(supabase, 'investor-1')

    expect(stats.investedCents).toBe(150_000)
    expect(stats.activeProjects).toBe(2)
    expect(stats.realizedReturnCents).toBe(35_000)
    expect(stats.projectedReturnCents).toBe(7_000)
  })

  it('counts distinct projects only once when investor has multiple investments in the same project', async () => {
    const supabase = makeSupabase([
      { amount_cents: 50_000, project_id: 'proj-1', status: 'active', realized_return_cents: null, projected_return_cents: 1_000, investment_projects: { name: 'Projeto A' } },
      { amount_cents: 25_000, project_id: 'proj-1', status: 'active', realized_return_cents: null, projected_return_cents: 500, investment_projects: { name: 'Projeto A' } },
    ])
    const stats = await fetchInvestorDashboardStats(supabase, 'investor-1')

    expect(stats.activeProjects).toBe(1)
    expect(stats.investedCents).toBe(75_000)
  })

  it('computes estimatedValueCents as active invested amount plus active projected return', async () => {
    const supabase = makeSupabase([
      { amount_cents: 100_000, project_id: 'proj-1', status: 'active', realized_return_cents: null, projected_return_cents: 15_000, investment_projects: { name: 'Projeto A' } },
      { amount_cents: 30_000, project_id: 'proj-2', status: 'returned', realized_return_cents: 35_000, projected_return_cents: null, investment_projects: { name: 'Projeto B' } },
    ])
    const stats = await fetchInvestorDashboardStats(supabase, 'investor-1')

    expect(stats.estimatedValueCents).toBe(115_000)
  })

  it('groups active investments by project name with cents totals and percentage of active capital, ordered descending', async () => {
    const supabase = makeSupabase([
      { amount_cents: 60_000, project_id: 'proj-1', status: 'active', realized_return_cents: null, projected_return_cents: null, investment_projects: { name: 'Arena Live Lisboa' } },
      { amount_cents: 40_000, project_id: 'proj-1', status: 'active', realized_return_cents: null, projected_return_cents: null, investment_projects: { name: 'Arena Live Lisboa' } },
      { amount_cents: 65_000, project_id: 'proj-2', status: 'active', realized_return_cents: null, projected_return_cents: null, investment_projects: { name: 'Atlantic Sessions' } },
      { amount_cents: 35_000, project_id: 'proj-3', status: 'active', realized_return_cents: null, projected_return_cents: null, investment_projects: { name: 'International Tour' } },
      { amount_cents: 999_000, project_id: 'proj-4', status: 'returned', realized_return_cents: 1_000, projected_return_cents: null, investment_projects: { name: 'Excluido (nao ativo)' } },
    ])
    const stats = await fetchInvestorDashboardStats(supabase, 'investor-1')

    expect(stats.distribution).toEqual([
      { name: 'Arena Live Lisboa', amountCents: 100_000, percentage: 50 },
      { name: 'Atlantic Sessions', amountCents: 65_000, percentage: 32.5 },
      { name: 'International Tour', amountCents: 35_000, percentage: 17.5 },
    ])
    expect(stats.distribution.find(d => d.name === 'Excluido (nao ativo)')).toBeUndefined()
  })

  it('falls back to a placeholder name when the joined project is missing', async () => {
    const supabase = makeSupabase([
      { amount_cents: 10_000, project_id: 'proj-1', status: 'active', realized_return_cents: null, projected_return_cents: null, investment_projects: null },
    ])
    const stats = await fetchInvestorDashboardStats(supabase, 'investor-1')

    expect(stats.distribution).toEqual([{ name: 'Projeto sem nome', amountCents: 10_000, percentage: 100 }])
  })

  it('queries investments filtered by investor_id', async () => {
    const supabase = makeSupabase([])
    await fetchInvestorDashboardStats(supabase, 'investor-42')

    expect(supabase.from).toHaveBeenCalledWith('investments')
    expect(supabase.select).toHaveBeenCalledWith(
      'amount_cents, project_id, status, realized_return_cents, projected_return_cents, investment_projects(name)'
    )
    expect(supabase.eq).toHaveBeenCalledWith('investor_id', 'investor-42')
  })
})
