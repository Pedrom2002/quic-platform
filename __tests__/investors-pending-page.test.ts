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

describe('InvestorPendingPage', () => {
  it('redirects to /investors/login when there is no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { default: InvestorPendingPage } = await import('@/app/investors/(public)/pending/page')

    await expect(InvestorPendingPage()).rejects.toThrow('REDIRECT:/investors/login')
  })

  it('redirects to /investors/dashboard when the investor is already approved', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSelect.mockReturnValue(makeSelectChain({ status: 'approved' }))
    const { default: InvestorPendingPage } = await import('@/app/investors/(public)/pending/page')

    await expect(InvestorPendingPage()).rejects.toThrow('REDIRECT:/investors/dashboard')
  })

  it('renders the pending message (not the rejected message) when status is pending', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSelect.mockReturnValue(makeSelectChain({ status: 'pending' }))
    const { default: InvestorPendingPage } = await import('@/app/investors/(public)/pending/page')

    const result = await InvestorPendingPage()

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(JSON.stringify(result)).toContain('A tua conta está em análise')
  })

  it('renders the rejected message when status is rejected', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSelect.mockReturnValue(makeSelectChain({ status: 'rejected' }))
    const { default: InvestorPendingPage } = await import('@/app/investors/(public)/pending/page')

    const result = await InvestorPendingPage()

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(JSON.stringify(result)).toContain('Pedido não aprovado')
  })
})
