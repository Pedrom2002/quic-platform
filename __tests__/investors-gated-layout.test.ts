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
vi.mock('@/components/investors/Nav', () => ({
  Nav: ({ userName }: { userName: string }) => `Nav(${userName})`,
}))

beforeEach(() => {
  mockGetInvestorProfile.mockReset()
  mockRedirect.mockClear()
})

describe('InvestorsGatedLayout', () => {
  it('redirects to /investors/login when there is no session', async () => {
    mockGetInvestorProfile.mockResolvedValue({ authenticated: false })
    const { default: InvestorsGatedLayout } = await import('@/app/investors/(gated)/layout')

    await expect(
      InvestorsGatedLayout({ children: null })
    ).rejects.toThrow('REDIRECT:/investors/login')
  })

  it('redirects to /investors/pending when the investor is pending', async () => {
    mockGetInvestorProfile.mockResolvedValue({
      authenticated: true,
      profile: { userId: 'user-1', fullName: 'Maria Silva', status: 'pending' },
    })
    const { default: InvestorsGatedLayout } = await import('@/app/investors/(gated)/layout')

    await expect(
      InvestorsGatedLayout({ children: null })
    ).rejects.toThrow('REDIRECT:/investors/pending')
  })

  it('redirects to /investors/pending when there is no investors row at all', async () => {
    mockGetInvestorProfile.mockResolvedValue({ authenticated: true, profile: null })
    const { default: InvestorsGatedLayout } = await import('@/app/investors/(gated)/layout')

    await expect(
      InvestorsGatedLayout({ children: null })
    ).rejects.toThrow('REDIRECT:/investors/pending')
  })

  it('renders Nav and children when the investor is approved', async () => {
    mockGetInvestorProfile.mockResolvedValue({
      authenticated: true,
      profile: { userId: 'user-1', fullName: 'Maria Silva', status: 'approved' },
    })
    const { default: InvestorsGatedLayout } = await import('@/app/investors/(gated)/layout')

    const result = await InvestorsGatedLayout({ children: 'CHILDREN' as unknown as React.ReactNode })

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(JSON.stringify(result)).toContain('Maria Silva')
    expect(JSON.stringify(result)).toContain('CHILDREN')
  })
})
