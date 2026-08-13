import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockSelect, mockCreateClient, mockRedirect } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSelect: vi.fn(),
  mockCreateClient: vi.fn(),
  mockRedirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))
vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))
vi.mock('@/components/investors/Nav', () => ({
  Nav: ({ userName }: { userName: string }) => `Nav(${userName})`,
}))

function makeSelectChain(data: unknown) {
  return {
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data, error: null }),
    }),
  }
}

beforeEach(() => {
  mockGetUser.mockReset()
  mockSelect.mockReset()
  mockCreateClient.mockReset()
  mockRedirect.mockClear()
  mockCreateClient.mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue({ select: mockSelect }),
  })
})

describe('InvestorsGatedLayout', () => {
  it('redirects to /investors/login when there is no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { default: InvestorsGatedLayout } = await import('@/app/investors/(gated)/layout')

    await expect(
      InvestorsGatedLayout({ children: null })
    ).rejects.toThrow('REDIRECT:/investors/login')
  })

  it('redirects to /investors/pending when the investor is pending', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSelect.mockReturnValue(makeSelectChain({ full_name: 'Maria Silva', status: 'pending' }))
    const { default: InvestorsGatedLayout } = await import('@/app/investors/(gated)/layout')

    await expect(
      InvestorsGatedLayout({ children: null })
    ).rejects.toThrow('REDIRECT:/investors/pending')
  })

  it('redirects to /investors/pending when there is no investors row at all', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSelect.mockReturnValue(makeSelectChain(null))
    const { default: InvestorsGatedLayout } = await import('@/app/investors/(gated)/layout')

    await expect(
      InvestorsGatedLayout({ children: null })
    ).rejects.toThrow('REDIRECT:/investors/pending')
  })

  it('renders Nav and children when the investor is approved', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSelect.mockReturnValue(makeSelectChain({ full_name: 'Maria Silva', status: 'approved' }))
    const { default: InvestorsGatedLayout } = await import('@/app/investors/(gated)/layout')

    const result = await InvestorsGatedLayout({ children: 'CHILDREN' as unknown as React.ReactNode })

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(JSON.stringify(result)).toContain('Maria Silva')
    expect(JSON.stringify(result)).toContain('CHILDREN')
  })
})
