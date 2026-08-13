import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSelect, mockCreateClient } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockCreateClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

function makeSupabaseStub(rows: Array<{ amount_cents: number; project_id: string; status: string; realized_return_cents: number | null; projected_return_cents: number | null }>) {
  return {
    from: vi.fn().mockReturnValue({
      select: mockSelect.mockResolvedValue({ data: rows, error: null }),
    }),
  }
}

beforeEach(() => {
  mockSelect.mockReset()
  mockCreateClient.mockReset()
})

describe('getInvestorDashboardStats', () => {
  it('returns zeroed stats when investor has no investments', async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseStub([]))
    const { getInvestorDashboardStats } = await import('@/app/investors/(gated)/dashboard/actions')
    const stats = await getInvestorDashboardStats()

    expect(stats).toEqual({
      investedCents: 0,
      activeProjects: 0,
      realizedReturnCents: 0,
      projectedReturnCents: 0,
    })
  })

  it('aggregates active investments only for invested amount and project count', async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseStub([
      { amount_cents: 100_000, project_id: 'proj-1', status: 'active', realized_return_cents: null, projected_return_cents: 5_000 },
      { amount_cents: 50_000, project_id: 'proj-2', status: 'active', realized_return_cents: null, projected_return_cents: 2_000 },
      { amount_cents: 30_000, project_id: 'proj-3', status: 'returned', realized_return_cents: 35_000, projected_return_cents: null },
    ]))
    const { getInvestorDashboardStats } = await import('@/app/investors/(gated)/dashboard/actions')
    const stats = await getInvestorDashboardStats()

    expect(stats.investedCents).toBe(150_000)
    expect(stats.activeProjects).toBe(2)
    expect(stats.realizedReturnCents).toBe(35_000)
    expect(stats.projectedReturnCents).toBe(7_000)
  })

  it('counts distinct projects only once when investor has multiple investments in the same project', async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseStub([
      { amount_cents: 50_000, project_id: 'proj-1', status: 'active', realized_return_cents: null, projected_return_cents: 1_000 },
      { amount_cents: 25_000, project_id: 'proj-1', status: 'active', realized_return_cents: null, projected_return_cents: 500 },
    ]))
    const { getInvestorDashboardStats } = await import('@/app/investors/(gated)/dashboard/actions')
    const stats = await getInvestorDashboardStats()

    expect(stats.activeProjects).toBe(1)
    expect(stats.investedCents).toBe(75_000)
  })
})
