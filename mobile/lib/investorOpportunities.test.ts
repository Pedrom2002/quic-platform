// mobile/lib/investorOpportunities.test.ts
import { describe, it, expect, jest } from '@jest/globals'
import { fetchInvestorOpportunities } from './investorOpportunities'

describe('fetchInvestorOpportunities', () => {
  function makeSupabase(rows: Array<{
    id: string
    name: string
    description: string | null
    funding_goal_cents: number
    investment_deadline: string | null
  }> | null) {
    const order = jest.fn<() => Promise<{ data: unknown; error: unknown }>>().mockResolvedValue({ data: rows, error: null })
    const eq = jest.fn(() => ({ order }))
    const select = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ select }))
    return { supabase: { from } as never, from, select, eq, order }
  }

  it('maps rows to InvestorOpportunity with camelCase fields', async () => {
    const { supabase } = makeSupabase([
      { id: 'proj-1', name: 'Concerto Sala Tejo', description: 'Produção de médio porte', funding_goal_cents: 500_000, investment_deadline: '2026-11-01' },
    ])

    const opportunities = await fetchInvestorOpportunities(supabase)

    expect(opportunities).toEqual([
      { id: 'proj-1', name: 'Concerto Sala Tejo', description: 'Produção de médio porte', fundingGoalCents: 500_000, investmentDeadline: '2026-11-01' },
    ])
  })

  it('returns an empty array when data is null', async () => {
    const { supabase } = makeSupabase(null)

    const opportunities = await fetchInvestorOpportunities(supabase)

    expect(opportunities).toEqual([])
  })

  it('queries investment_projects filtered by open status, ordered by deadline ascending with nulls first excluded from priority', async () => {
    const { supabase, from, select, eq, order } = makeSupabase([])

    await fetchInvestorOpportunities(supabase)

    expect(from).toHaveBeenCalledWith('investment_projects')
    expect(select).toHaveBeenCalledWith('id, name, description, funding_goal_cents, investment_deadline')
    expect(eq).toHaveBeenCalledWith('status', 'open')
    expect(order).toHaveBeenCalledWith('investment_deadline', { ascending: true, nullsFirst: false })
  })
})
