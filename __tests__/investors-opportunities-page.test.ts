import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockOrder, mockEq, mockSelect, mockCreateClient } = vi.hoisted(() => ({
  mockOrder: vi.fn(),
  mockEq: vi.fn(),
  mockSelect: vi.fn(),
  mockCreateClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    ({ type: 'a', props: { href, ...props, children } }),
}))

beforeEach(() => {
  mockOrder.mockReset()
  mockEq.mockReset()
  mockSelect.mockReset()
  mockCreateClient.mockReset()
  mockEq.mockReturnValue({ order: mockOrder })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockCreateClient.mockResolvedValue({
    from: vi.fn().mockReturnValue({ select: mockSelect }),
  })
})

describe('InvestorOpportunitiesPage', () => {
  it('renders only open projects with formatted funding goal', async () => {
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'proj-1',
          name: 'Festival de Verão',
          description: 'Um festival de música ao ar livre.',
          funding_goal_cents: 500000,
          investment_deadline: '2026-12-31',
        },
      ],
      error: null,
    })
    const { default: InvestorOpportunitiesPage } = await import('@/app/investors/(gated)/opportunities/page')

    const result = await InvestorOpportunitiesPage()
    const html = JSON.stringify(result)

    expect(mockSelect).toHaveBeenCalledWith('id, name, description, funding_goal_cents, investment_deadline')
    expect(mockEq).toHaveBeenCalledWith('status', 'open')
    expect(html).toContain('Festival de Verão')
    expect(html).toContain('5000,00')
  })

  it('shows an empty-state message when there are no open projects', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })
    const { default: InvestorOpportunitiesPage } = await import('@/app/investors/(gated)/opportunities/page')

    const result = await InvestorOpportunitiesPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Sem oportunidades disponíveis de momento.')
  })

  it('shows an empty-state message when the query returns null data', async () => {
    mockOrder.mockResolvedValue({ data: null, error: null })
    const { default: InvestorOpportunitiesPage } = await import('@/app/investors/(gated)/opportunities/page')

    const result = await InvestorOpportunitiesPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Sem oportunidades disponíveis de momento.')
  })
})
