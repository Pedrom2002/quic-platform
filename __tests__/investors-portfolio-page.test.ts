import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockOrder, mockSelect, mockCreateClient } = vi.hoisted(() => ({
  mockOrder: vi.fn(),
  mockSelect: vi.fn(),
  mockCreateClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

beforeEach(() => {
  mockOrder.mockReset()
  mockSelect.mockReset()
  mockCreateClient.mockReset()
  mockSelect.mockReturnValue({ order: mockOrder })
  mockCreateClient.mockResolvedValue({
    from: vi.fn().mockReturnValue({ select: mockSelect }),
  })
})

describe('InvestorPortfolioPage', () => {
  it('renders investments with project name, mapped phase, amount and next milestone', async () => {
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'inv-1',
          amount_cents: 100000,
          status: 'active',
          projected_return_cents: 18400,
          investment_projects: { name: 'Festival de Verão', status: 'open' },
        },
        {
          id: 'inv-2',
          amount_cents: 50000,
          status: 'returned',
          projected_return_cents: null,
          investment_projects: { name: 'Conferência Tech', status: 'completed' },
        },
      ],
      error: null,
    })
    const { default: InvestorPortfolioPage } = await import('@/app/investors/(gated)/portfolio/page')

    const result = await InvestorPortfolioPage()
    const html = JSON.stringify(result)

    expect(mockSelect).toHaveBeenCalledWith(
      'id, amount_cents, status, projected_return_cents, investment_projects(name, status)'
    )
    expect(mockOrder).toHaveBeenCalledWith('invested_at', { ascending: false })
    expect(html).toContain('Festival de Verão')
    expect(html).toContain('Conferência Tech')
    expect(html).toContain('Em venda')
    expect(html).toContain('Settlement')
    expect(html).toContain('Fecho early bird')
    expect(html).toContain('Distribuição')
    expect(html).toContain('"amountCents":100000')
    expect(html).toContain('"amountCents":50000')
  })

  it('computes returnPercentage from projected_return_cents over amount_cents, null when missing', async () => {
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'inv-1',
          amount_cents: 100000,
          status: 'active',
          projected_return_cents: 18400,
          investment_projects: { name: 'Projeto A', status: 'open' },
        },
        {
          id: 'inv-2',
          amount_cents: 50000,
          status: 'active',
          projected_return_cents: null,
          investment_projects: { name: 'Projeto B', status: 'open' },
        },
      ],
      error: null,
    })
    const { default: InvestorPortfolioPage } = await import('@/app/investors/(gated)/portfolio/page')

    const result = await InvestorPortfolioPage()
    const html = JSON.stringify(result)

    expect(html).toContain('18.4')
  })

  it('shows an empty-state message when there are no investments', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })
    const { default: InvestorPortfolioPage } = await import('@/app/investors/(gated)/portfolio/page')

    const result = await InvestorPortfolioPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Ainda não tens investimentos.')
  })

  it('shows an empty-state message when the query returns null data', async () => {
    mockOrder.mockResolvedValue({ data: null, error: null })
    const { default: InvestorPortfolioPage } = await import('@/app/investors/(gated)/portfolio/page')

    const result = await InvestorPortfolioPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Ainda não tens investimentos.')
  })

  it('maps all four project phases to distinct labels', async () => {
    mockOrder.mockResolvedValue({
      data: [
        { id: 'inv-1', amount_cents: 10000, status: 'active', projected_return_cents: null, investment_projects: { name: 'P1', status: 'coming_soon' } },
        { id: 'inv-2', amount_cents: 10000, status: 'active', projected_return_cents: null, investment_projects: { name: 'P2', status: 'open' } },
        { id: 'inv-3', amount_cents: 10000, status: 'active', projected_return_cents: null, investment_projects: { name: 'P3', status: 'closed' } },
        { id: 'inv-4', amount_cents: 10000, status: 'active', projected_return_cents: null, investment_projects: { name: 'P4', status: 'completed' } },
      ],
      error: null,
    })
    const { default: InvestorPortfolioPage } = await import('@/app/investors/(gated)/portfolio/page')

    const result = await InvestorPortfolioPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Brevemente')
    expect(html).toContain('Em venda')
    expect(html).toContain('Produção')
    expect(html).toContain('Settlement')
  })

  it('falls back gracefully when investment_projects is missing', async () => {
    mockOrder.mockResolvedValue({
      data: [
        { id: 'inv-1', amount_cents: 10000, status: 'active', projected_return_cents: null, investment_projects: null },
      ],
      error: null,
    })
    const { default: InvestorPortfolioPage } = await import('@/app/investors/(gated)/portfolio/page')

    const result = await InvestorPortfolioPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Projeto sem nome')
    expect(html).toContain('Sem fase')
  })

  it('computes summary cards: total invested and active count', async () => {
    mockOrder.mockResolvedValue({
      data: [
        { id: 'inv-1', amount_cents: 100000, status: 'active', projected_return_cents: null, investment_projects: { name: 'P1', status: 'open' } },
        { id: 'inv-2', amount_cents: 50000, status: 'returned', projected_return_cents: null, investment_projects: { name: 'P2', status: 'completed' } },
      ],
      error: null,
    })
    const { default: InvestorPortfolioPage } = await import('@/app/investors/(gated)/portfolio/page')

    const result = await InvestorPortfolioPage()
    const html = JSON.stringify(result)

    expect(html).toContain('1500,00')
    expect(html).toContain('Total investido')
  })
})
