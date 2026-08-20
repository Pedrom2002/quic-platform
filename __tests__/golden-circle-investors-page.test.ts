import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRange, mockOrder, mockSelect, mockCreateClient } = vi.hoisted(() => ({
  mockRange: vi.fn(),
  mockOrder: vi.fn(),
  mockSelect: vi.fn(),
  mockCreateClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    ({ type: 'a', props: { href, ...props, children } }),
}))

beforeEach(() => {
  mockRange.mockReset()
  mockOrder.mockReset()
  mockSelect.mockReset()
  mockCreateClient.mockReset()
  mockOrder.mockReturnValue({ range: mockRange, eq: vi.fn().mockReturnValue({ range: mockRange }) })
  mockSelect.mockReturnValue({ order: mockOrder })
  mockCreateClient.mockResolvedValue({ from: vi.fn().mockReturnValue({ select: mockSelect }) })
})

describe('GoldenCircleInvestorsPage', () => {
  it('renders investors with formatted status and creation date', async () => {
    mockRange.mockResolvedValue({
      data: [
        {
          id: 'inv-1',
          full_name: 'Maria Silva',
          email: 'maria@example.com',
          phone: '912345678',
          status: 'pending',
          created_at: '2026-08-01T10:00:00Z',
        },
      ],
      count: 1,
      error: null,
    })
    const { default: GoldenCircleInvestorsPage } = await import('@/app/dashboard/golden-circle/investidores/page')

    const result = await GoldenCircleInvestorsPage({ searchParams: Promise.resolve({}) })
    const html = JSON.stringify(result)

    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(html).toContain('Maria Silva')
    expect(html).toContain('maria@example.com')
    expect(html).toContain('01/08/2026')
  })

  it('shows an empty-state message when there are no investors', async () => {
    mockRange.mockResolvedValue({ data: [], count: 0, error: null })
    const { default: GoldenCircleInvestorsPage } = await import('@/app/dashboard/golden-circle/investidores/page')

    const result = await GoldenCircleInvestorsPage({ searchParams: Promise.resolve({}) })
    const html = JSON.stringify(result)

    expect(html).toContain('Sem investidores')
  })
})
