import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSingle, mockEq, mockSelect, mockCreateClient, mockNotFound } = vi.hoisted(() => ({
  mockSingle: vi.fn(),
  mockEq: vi.fn(),
  mockSelect: vi.fn(),
  mockCreateClient: vi.fn(),
  mockNotFound: vi.fn(() => { throw new Error('NOT_FOUND') }),
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }))
vi.mock('next/navigation', () => ({ notFound: mockNotFound }))

function makeSupabase() {
  const investorsChain = { eq: mockEq.mockReturnValue({ single: mockSingle }) }
  const investmentsChain = { eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }) }
  return {
    from: vi.fn((table: string) => {
      if (table === 'investors') return { select: vi.fn().mockReturnValue(investorsChain) }
      return { select: vi.fn().mockReturnValue(investmentsChain) }
    }),
  }
}

beforeEach(() => {
  mockSingle.mockReset()
  mockEq.mockReset()
  mockSelect.mockReset()
  mockCreateClient.mockReset()
  mockNotFound.mockClear()
})

describe('GoldenCircleInvestorDetailPage', () => {
  it('renders investor profile and calls notFound when missing', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })
    mockCreateClient.mockResolvedValue(makeSupabase())
    const { default: GoldenCircleInvestorDetailPage } = await import('@/app/dashboard/golden-circle/investidores/[investorId]/page')

    await expect(
      GoldenCircleInvestorDetailPage({ params: Promise.resolve({ investorId: 'missing' }) })
    ).rejects.toThrow('NOT_FOUND')
  })

  it('renders investor profile when found', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'inv-1',
        full_name: 'Maria Silva',
        email: 'maria@example.com',
        phone: '912345678',
        status: 'approved',
        created_at: '2026-08-01T10:00:00Z',
        approved_at: '2026-08-02T10:00:00Z',
      },
      error: null,
    })
    mockCreateClient.mockResolvedValue(makeSupabase())
    const { default: GoldenCircleInvestorDetailPage } = await import('@/app/dashboard/golden-circle/investidores/[investorId]/page')

    const result = await GoldenCircleInvestorDetailPage({ params: Promise.resolve({ investorId: 'inv-1' }) })
    const html = JSON.stringify(result)

    expect(html).toContain('Maria Silva')
    expect(html).toContain('maria@example.com')
  })
})
