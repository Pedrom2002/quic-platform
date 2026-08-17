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
  it('renders investments ordered by invested_at descending, with formatted amount, date and status badge', async () => {
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'inv-1',
          amount_cents: 100000,
          invested_at: '2026-06-15T10:00:00Z',
          status: 'active',
          investment_projects: { name: 'Festival de Verão' },
        },
        {
          id: 'inv-2',
          amount_cents: 50000,
          invested_at: '2025-01-10T10:00:00Z',
          status: 'returned',
          investment_projects: { name: 'Conferência Tech' },
        },
      ],
      error: null,
    })
    const { default: InvestorPortfolioPage } = await import('@/app/investors/(gated)/portfolio/page')

    const result = await InvestorPortfolioPage()
    const html = JSON.stringify(result)

    expect(mockSelect).toHaveBeenCalledWith('id, amount_cents, invested_at, status, investment_projects(name)')
    expect(mockOrder).toHaveBeenCalledWith('invested_at', { ascending: false })
    expect(html).toContain('Festival de Verão')
    expect(html).toContain('Conferência Tech')
    expect(html).toContain('1000,00')
    expect(html).toContain('500,00')
    expect(html).toContain('15/06/2026')
    expect(html).toContain('10/01/2025')
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

  it('renders distinct status labels and classes for active, returned and written_off', async () => {
    mockOrder.mockResolvedValue({
      data: [
        { id: 'inv-1', amount_cents: 10000, invested_at: '2026-01-01T00:00:00Z', status: 'active', investment_projects: { name: 'Projeto A' } },
        { id: 'inv-2', amount_cents: 10000, invested_at: '2026-01-01T00:00:00Z', status: 'returned', investment_projects: { name: 'Projeto B' } },
        { id: 'inv-3', amount_cents: 10000, invested_at: '2026-01-01T00:00:00Z', status: 'written_off', investment_projects: { name: 'Projeto C' } },
      ],
      error: null,
    })
    const { default: InvestorPortfolioPage } = await import('@/app/investors/(gated)/portfolio/page')

    const result = await InvestorPortfolioPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Ativo')
    expect(html).toContain('text-emerald-700')
    expect(html).toContain('Devolvido')
    expect(html).toContain('text-sky-700')
    expect(html).toContain('Perdido')
    expect(html).toContain('text-red-700')
  })

  it('falls back to the raw status and neutral classes for an unmapped status', async () => {
    mockOrder.mockResolvedValue({
      data: [
        { id: 'inv-1', amount_cents: 10000, invested_at: '2026-01-01T00:00:00Z', status: 'pending_review', investment_projects: { name: 'Projeto D' } },
      ],
      error: null,
    })
    const { default: InvestorPortfolioPage } = await import('@/app/investors/(gated)/portfolio/page')

    const result = await InvestorPortfolioPage()
    const html = JSON.stringify(result)

    expect(html).toContain('pending_review')
    expect(html).toContain('text-zinc-600')
  })
})
