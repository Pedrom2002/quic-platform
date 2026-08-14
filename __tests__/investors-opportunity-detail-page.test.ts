import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockEq, mockSelect, mockCreateClient, mockNotFound } = vi.hoisted(() => ({
  mockEq: vi.fn(),
  mockSelect: vi.fn(),
  mockCreateClient: vi.fn(),
  mockNotFound: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))
vi.mock('next/navigation', () => ({
  notFound: mockNotFound,
}))

beforeEach(() => {
  mockEq.mockReset()
  mockSelect.mockReset()
  mockCreateClient.mockReset()
  mockNotFound.mockClear()
  mockSelect.mockReturnValue({
    eq: mockEq.mockReturnValue({
      single: vi.fn(),
    }),
  })
  mockCreateClient.mockResolvedValue({
    from: vi.fn().mockReturnValue({ select: mockSelect }),
  })
})

function mockSingleResult(data: unknown) {
  mockSelect.mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data, error: null }),
    }),
  })
}

describe('InvestorOpportunityDetailPage', () => {
  it('renders the project when it exists and is open', async () => {
    mockSingleResult({
      id: 'proj-1',
      name: 'Festival de Verão',
      description: 'Descrição completa do projeto.',
      funding_goal_cents: 500000,
      capacity: 1000,
      investment_deadline: '2026-12-31',
      status: 'open',
    })
    const { default: InvestorOpportunityDetailPage } = await import('@/app/investors/(gated)/opportunities/[id]/page')

    const result = await InvestorOpportunityDetailPage({ params: Promise.resolve({ id: 'proj-1' }) })
    const html = JSON.stringify(result)

    expect(mockNotFound).not.toHaveBeenCalled()
    expect(html).toContain('Festival de Verão')
    expect(html).toContain('Descrição completa do projeto.')
    expect(html).toContain('5000,00 €')
  })

  it('calls notFound when the project does not exist', async () => {
    mockSingleResult(null)
    const { default: InvestorOpportunityDetailPage } = await import('@/app/investors/(gated)/opportunities/[id]/page')

    await expect(
      InvestorOpportunityDetailPage({ params: Promise.resolve({ id: 'missing' }) })
    ).rejects.toThrow('NOT_FOUND')
  })

  it('calls notFound when the project exists but is not open', async () => {
    mockSingleResult({
      id: 'proj-2',
      name: 'Projeto Fechado',
      description: null,
      funding_goal_cents: 100000,
      capacity: null,
      investment_deadline: null,
      status: 'closed',
    })
    const { default: InvestorOpportunityDetailPage } = await import('@/app/investors/(gated)/opportunities/[id]/page')

    await expect(
      InvestorOpportunityDetailPage({ params: Promise.resolve({ id: 'proj-2' }) })
    ).rejects.toThrow('NOT_FOUND')
  })
})
