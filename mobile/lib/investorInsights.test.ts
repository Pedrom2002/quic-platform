// mobile/lib/investorInsights.test.ts
import { describe, it, expect, jest } from '@jest/globals'
import { fetchInvestorInsights } from './investorInsights'

describe('fetchInvestorInsights', () => {
  function makeSupabase(rows: Array<{ amount_cents: number; status: string }> | null) {
    const eq = jest.fn<() => Promise<{ data: unknown; error: unknown }>>().mockResolvedValue({ data: rows, error: null })
    const select = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ select }))
    return { supabase: { from } as never, from, select, eq }
  }

  it('returns 3 entries in fixed order even when a status has no investments', async () => {
    const { supabase } = makeSupabase([
      { amount_cents: 100_000, status: 'active' },
    ])

    const breakdown = await fetchInvestorInsights(supabase, 'investor-1')

    expect(breakdown.map(b => b.status)).toEqual(['active', 'returned', 'written_off'])
    expect(breakdown[1]).toEqual({ status: 'returned', count: 0, totalCents: 0, percentage: 0 })
    expect(breakdown[2]).toEqual({ status: 'written_off', count: 0, totalCents: 0, percentage: 0 })
  })

  it('computes count and totalCents correctly per status', async () => {
    const { supabase } = makeSupabase([
      { amount_cents: 100_000, status: 'active' },
      { amount_cents: 50_000, status: 'active' },
      { amount_cents: 30_000, status: 'returned' },
    ])

    const breakdown = await fetchInvestorInsights(supabase, 'investor-1')

    expect(breakdown[0]).toEqual({ status: 'active', count: 2, totalCents: 150_000, percentage: expect.any(Number) })
    expect(breakdown[1].count).toBe(1)
    expect(breakdown[1].totalCents).toBe(30_000)
  })

  it('computes percentage as a fraction of the grand total across all statuses', async () => {
    const { supabase } = makeSupabase([
      { amount_cents: 150_000, status: 'active' },
      { amount_cents: 50_000, status: 'returned' },
    ])

    const breakdown = await fetchInvestorInsights(supabase, 'investor-1')

    expect(breakdown[0].percentage).toBe(75)
    expect(breakdown[1].percentage).toBe(25)
  })

  it('returns percentage 0 for all statuses when there are no investments', async () => {
    const { supabase } = makeSupabase([])

    const breakdown = await fetchInvestorInsights(supabase, 'investor-1')

    expect(breakdown.every(b => b.percentage === 0)).toBe(true)
  })

  it('returns 3 zeroed breakdowns when data is null', async () => {
    const { supabase } = makeSupabase(null)

    const breakdown = await fetchInvestorInsights(supabase, 'investor-1')

    expect(breakdown).toEqual([
      { status: 'active', count: 0, totalCents: 0, percentage: 0 },
      { status: 'returned', count: 0, totalCents: 0, percentage: 0 },
      { status: 'written_off', count: 0, totalCents: 0, percentage: 0 },
    ])
  })

  it('queries investments filtered by investor_id, selecting amount_cents and status', async () => {
    const { supabase, from, select, eq } = makeSupabase([])

    await fetchInvestorInsights(supabase, 'investor-42')

    expect(from).toHaveBeenCalledWith('investments')
    expect(select).toHaveBeenCalledWith('amount_cents, status')
    expect(eq).toHaveBeenCalledWith('investor_id', 'investor-42')
  })
})
