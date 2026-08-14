import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetInvestorProfile, mockRedirect } = vi.hoisted(() => ({
  mockGetInvestorProfile: vi.fn(),
  mockRedirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
}))

vi.mock('@/lib/investors/get-profile', () => ({
  getInvestorProfile: mockGetInvestorProfile,
}))
vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

beforeEach(() => {
  mockGetInvestorProfile.mockReset()
  mockRedirect.mockClear()
})

describe('InvestorPendingPage', () => {
  it('redirects to /investors/login when there is no session', async () => {
    mockGetInvestorProfile.mockResolvedValue({ authenticated: false })
    const { default: InvestorPendingPage } = await import('@/app/investors/(public)/pending/page')

    await expect(InvestorPendingPage()).rejects.toThrow('REDIRECT:/investors/login')
  })

  it('redirects to /investors/dashboard when the investor is already approved', async () => {
    mockGetInvestorProfile.mockResolvedValue({
      authenticated: true,
      profile: { userId: 'user-1', fullName: 'Maria Silva', phone: null, email: 'maria@example.com', status: 'approved' },
    })
    const { default: InvestorPendingPage } = await import('@/app/investors/(public)/pending/page')

    await expect(InvestorPendingPage()).rejects.toThrow('REDIRECT:/investors/dashboard')
  })

  it('renders the pending message (not the rejected message) when status is pending', async () => {
    mockGetInvestorProfile.mockResolvedValue({
      authenticated: true,
      profile: { userId: 'user-1', fullName: 'Maria Silva', phone: null, email: 'maria@example.com', status: 'pending' },
    })
    const { default: InvestorPendingPage } = await import('@/app/investors/(public)/pending/page')

    const result = await InvestorPendingPage()

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(JSON.stringify(result)).toContain('A tua conta está em análise')
  })

  it('renders the rejected message when status is rejected', async () => {
    mockGetInvestorProfile.mockResolvedValue({
      authenticated: true,
      profile: { userId: 'user-1', fullName: 'Maria Silva', phone: null, email: 'maria@example.com', status: 'rejected' },
    })
    const { default: InvestorPendingPage } = await import('@/app/investors/(public)/pending/page')

    const result = await InvestorPendingPage()

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(JSON.stringify(result)).toContain('Pedido não aprovado')
  })
})
