import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSelect, mockCreateClient } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockCreateClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

beforeEach(() => {
  mockSelect.mockReset()
  mockCreateClient.mockReset()
  mockCreateClient.mockResolvedValue({
    from: vi.fn().mockReturnValue({ select: mockSelect }),
  })
})

describe('InvestorInsightsPage', () => {
  it('aggregates investments by status with count, total and percentage', async () => {
    mockSelect.mockResolvedValue({
      data: [
        { amount_cents: 100000, status: 'active' },
        { amount_cents: 50000, status: 'active' },
        { amount_cents: 30000, status: 'returned' },
        { amount_cents: 20000, status: 'written_off' },
      ],
      error: null,
    })
    const { default: InvestorInsightsPage } = await import('@/app/investors/(gated)/insights/page')

    const result = await InvestorInsightsPage()
    const html = JSON.stringify(result)

    expect(mockSelect).toHaveBeenCalledWith('amount_cents, status')
    // total = 200000 cents. active = 150000 (75.0%), returned = 30000 (15.0%), written_off = 20000 (10.0%)
    expect(html).toContain('Ativo')
    expect(html).toContain('2 investimentos')
    expect(html).toContain('1500,00')
    expect(html).toContain('75,0%')
    expect(html).toContain('Devolvido')
    expect(html).toContain('1 investimento')
    expect(html).toContain('300,00')
    expect(html).toContain('15,0%')
    expect(html).toContain('Perdido')
    expect(html).toContain('200,00')
    expect(html).toContain('10,0%')
  })

  it('shows a status card with zero investments when that status has none', async () => {
    mockSelect.mockResolvedValue({
      data: [{ amount_cents: 100000, status: 'active' }],
      error: null,
    })
    const { default: InvestorInsightsPage } = await import('@/app/investors/(gated)/insights/page')

    const result = await InvestorInsightsPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Devolvido')
    expect(html).toContain('0 investimentos')
    expect(html).toContain('0,00')
    expect(html).toContain('0,0%')
  })

  it('shows an empty-state message when there are no investments', async () => {
    mockSelect.mockResolvedValue({ data: [], error: null })
    const { default: InvestorInsightsPage } = await import('@/app/investors/(gated)/insights/page')

    const result = await InvestorInsightsPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Ainda não tens investimentos para analisar.')
  })

  it('shows an empty-state message when the query returns null data', async () => {
    mockSelect.mockResolvedValue({ data: null, error: null })
    const { default: InvestorInsightsPage } = await import('@/app/investors/(gated)/insights/page')

    const result = await InvestorInsightsPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Ainda não tens investimentos para analisar.')
  })

  it('does not produce NaN or Infinity percentages when there are no investments (covered by empty state, but the aggregation function itself must be safe)', async () => {
    mockSelect.mockResolvedValue({ data: [], error: null })
    const { default: InvestorInsightsPage } = await import('@/app/investors/(gated)/insights/page')

    const result = await InvestorInsightsPage()
    const html = JSON.stringify(result)

    expect(html).not.toContain('NaN')
    expect(html).not.toContain('Infinity')
  })
})
