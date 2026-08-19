// mobile/lib/investorTrackRecord.test.ts
import { describe, it, expect, jest } from '@jest/globals'
import { fetchInvestorTrackRecord } from './investorTrackRecord'

describe('fetchInvestorTrackRecord', () => {
  function makeSupabase(rows: Array<{
    id: string
    name: string
    funding_goal_cents: number
    actual_revenue_cents: number | null
    attendance: number | null
    created_at: string
  }> | null) {
    const order = jest.fn<() => Promise<{ data: unknown; error: unknown }>>().mockResolvedValue({ data: rows, error: null })
    const eq = jest.fn(() => ({ order }))
    const select = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ select }))
    return { supabase: { from } as never, from, select, eq, order }
  }

  it('maps rows to InvestorTrackRecordProject with camelCase fields', async () => {
    const { supabase } = makeSupabase([
      { id: 'proj-1', name: 'Concerto A', funding_goal_cents: 500_000, actual_revenue_cents: 550_000, attendance: 3800, created_at: '2026-01-01T00:00:00Z' },
    ])

    const summary = await fetchInvestorTrackRecord(supabase)

    expect(summary.projects).toEqual([
      { id: 'proj-1', name: 'Concerto A', fundingGoalCents: 500_000, actualRevenueCents: 550_000, attendance: 3800 },
    ])
  })

  it('computes completedCount as the number of returned projects', async () => {
    const { supabase } = makeSupabase([
      { id: 'proj-1', name: 'A', funding_goal_cents: 100_000, actual_revenue_cents: null, attendance: null, created_at: '2026-01-01T00:00:00Z' },
      { id: 'proj-2', name: 'B', funding_goal_cents: 200_000, actual_revenue_cents: null, attendance: null, created_at: '2026-02-01T00:00:00Z' },
    ])

    const summary = await fetchInvestorTrackRecord(supabase)

    expect(summary.completedCount).toBe(2)
  })

  it('sums actual_revenue_cents treating null as 0', async () => {
    const { supabase } = makeSupabase([
      { id: 'proj-1', name: 'A', funding_goal_cents: 100_000, actual_revenue_cents: 120_000, attendance: null, created_at: '2026-01-01T00:00:00Z' },
      { id: 'proj-2', name: 'B', funding_goal_cents: 200_000, actual_revenue_cents: null, attendance: null, created_at: '2026-02-01T00:00:00Z' },
    ])

    const summary = await fetchInvestorTrackRecord(supabase)

    expect(summary.totalRevenueCents).toBe(120_000)
  })

  it('sums attendance treating null as 0', async () => {
    const { supabase } = makeSupabase([
      { id: 'proj-1', name: 'A', funding_goal_cents: 100_000, actual_revenue_cents: null, attendance: 1500, created_at: '2026-01-01T00:00:00Z' },
      { id: 'proj-2', name: 'B', funding_goal_cents: 200_000, actual_revenue_cents: null, attendance: null, created_at: '2026-02-01T00:00:00Z' },
    ])

    const summary = await fetchInvestorTrackRecord(supabase)

    expect(summary.totalAttendance).toBe(1500)
  })

  it('returns a zeroed summary when data is null', async () => {
    const { supabase } = makeSupabase(null)

    const summary = await fetchInvestorTrackRecord(supabase)

    expect(summary).toEqual({ completedCount: 0, totalRevenueCents: 0, totalAttendance: 0, projects: [] })
  })

  it('queries investment_projects filtered by completed status, ordered by created_at descending', async () => {
    const { supabase, from, select, eq, order } = makeSupabase([])

    await fetchInvestorTrackRecord(supabase)

    expect(from).toHaveBeenCalledWith('investment_projects')
    expect(select).toHaveBeenCalledWith('id, name, funding_goal_cents, actual_revenue_cents, attendance, created_at')
    expect(eq).toHaveBeenCalledWith('status', 'completed')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
  })
})
