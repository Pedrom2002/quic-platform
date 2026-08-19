// mobile/lib/investorPortfolio.test.ts
import { describe, it, expect, jest } from '@jest/globals'
import { fetchInvestorPortfolio } from './investorPortfolio'

describe('fetchInvestorPortfolio', () => {
  function makeSupabase(rows: Array<{
    id: string
    amount_cents: number
    status: string
    projected_return_cents: number | null
    investment_projects: { name: string; status: string } | null
  }> | null) {
    const order = jest.fn<() => Promise<{ data: unknown; error: unknown }>>().mockResolvedValue({ data: rows, error: null })
    const eq = jest.fn(() => ({ order }))
    const select = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ select }))
    return { supabase: { from } as never, from, select, eq, order }
  }

  it('maps rows and computes totals for a single active investment', async () => {
    const { supabase } = makeSupabase([
      { id: 'inv-1', amount_cents: 100_000, status: 'active', projected_return_cents: 15_000, investment_projects: { name: 'Concerto Sala Tejo', status: 'open' } },
    ])

    const summary = await fetchInvestorPortfolio(supabase, 'investor-1')

    expect(summary).toEqual({
      totalCents: 100_000,
      investmentCount: 1,
      activeCount: 1,
      rows: [
        {
          id: 'inv-1',
          projectName: 'Concerto Sala Tejo',
          projectStatus: 'open',
          amountCents: 100_000,
          returnPercentage: 15,
          investmentStatus: 'active',
        },
      ],
    })
  })

  it('computes totalCents and activeCount across multiple rows with mixed status', async () => {
    const { supabase } = makeSupabase([
      { id: 'inv-1', amount_cents: 100_000, status: 'active', projected_return_cents: null, investment_projects: { name: 'A', status: 'open' } },
      { id: 'inv-2', amount_cents: 50_000, status: 'returned', projected_return_cents: null, investment_projects: { name: 'B', status: 'completed' } },
      { id: 'inv-3', amount_cents: 30_000, status: 'active', projected_return_cents: null, investment_projects: { name: 'C', status: 'closed' } },
    ])

    const summary = await fetchInvestorPortfolio(supabase, 'investor-1')

    expect(summary.totalCents).toBe(180_000)
    expect(summary.investmentCount).toBe(3)
    expect(summary.activeCount).toBe(2)
  })

  it('returns null returnPercentage when projected_return_cents is null', async () => {
    const { supabase } = makeSupabase([
      { id: 'inv-1', amount_cents: 100_000, status: 'active', projected_return_cents: null, investment_projects: { name: 'A', status: 'open' } },
    ])

    const summary = await fetchInvestorPortfolio(supabase, 'investor-1')

    expect(summary.rows[0].returnPercentage).toBeNull()
  })

  it('returns null returnPercentage when amountCents is zero', async () => {
    const { supabase } = makeSupabase([
      { id: 'inv-1', amount_cents: 0, status: 'active', projected_return_cents: 5_000, investment_projects: { name: 'A', status: 'open' } },
    ])

    const summary = await fetchInvestorPortfolio(supabase, 'investor-1')

    expect(summary.rows[0].returnPercentage).toBeNull()
  })

  it('falls back to a placeholder name and null status when the joined project is missing', async () => {
    const { supabase } = makeSupabase([
      { id: 'inv-1', amount_cents: 10_000, status: 'active', projected_return_cents: null, investment_projects: null },
    ])

    const summary = await fetchInvestorPortfolio(supabase, 'investor-1')

    expect(summary.rows[0].projectName).toBe('Projeto sem nome')
    expect(summary.rows[0].projectStatus).toBeNull()
  })

  it('returns a zeroed summary when data is null', async () => {
    const { supabase } = makeSupabase(null)

    const summary = await fetchInvestorPortfolio(supabase, 'investor-1')

    expect(summary).toEqual({ totalCents: 0, investmentCount: 0, activeCount: 0, rows: [] })
  })

  it('queries investments filtered by investor_id, ordered by invested_at descending', async () => {
    const { supabase, from, select, eq, order } = makeSupabase([])

    await fetchInvestorPortfolio(supabase, 'investor-42')

    expect(from).toHaveBeenCalledWith('investments')
    expect(select).toHaveBeenCalledWith('id, amount_cents, status, projected_return_cents, investment_projects(name, status)')
    expect(eq).toHaveBeenCalledWith('investor_id', 'investor-42')
    expect(order).toHaveBeenCalledWith('invested_at', { ascending: false })
  })
})
