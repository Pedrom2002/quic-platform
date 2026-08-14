import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetInvestorProfile } = vi.hoisted(() => ({
  mockGetInvestorProfile: vi.fn(),
}))

vi.mock('@/lib/investors/get-profile', () => ({
  getInvestorProfile: mockGetInvestorProfile,
}))

beforeEach(() => {
  mockGetInvestorProfile.mockReset()
})

describe('InvestorProfilePage', () => {
  it('renders current profile values, with email and status as read-only', async () => {
    mockGetInvestorProfile.mockResolvedValue({
      authenticated: true,
      profile: {
        userId: 'user-1',
        fullName: 'Maria Silva',
        phone: '912345678',
        email: 'maria@example.com',
        status: 'approved',
      },
    })
    const { default: InvestorProfilePage } = await import('@/app/investors/(gated)/profile/page')

    const result = await InvestorProfilePage()
    const html = JSON.stringify(result)

    expect(html).toContain('Maria Silva')
    expect(html).toContain('912345678')
    expect(html).toContain('maria@example.com')
    expect(html).toContain('Aprovado')
  })

  it('renders an empty phone field when phone is null', async () => {
    mockGetInvestorProfile.mockResolvedValue({
      authenticated: true,
      profile: {
        userId: 'user-1',
        fullName: 'Maria Silva',
        phone: null,
        email: 'maria@example.com',
        status: 'approved',
      },
    })
    const { default: InvestorProfilePage } = await import('@/app/investors/(gated)/profile/page')

    const result = await InvestorProfilePage()
    const html = JSON.stringify(result)

    expect(html).not.toContain('"initialPhone":null')
  })

  it('shows a fallback message when the profile cannot be loaded', async () => {
    mockGetInvestorProfile.mockResolvedValue({ authenticated: true, profile: null })
    const { default: InvestorProfilePage } = await import('@/app/investors/(gated)/profile/page')

    const result = await InvestorProfilePage()
    const html = JSON.stringify(result)

    expect(html).toContain('Não foi possível carregar o teu perfil.')
  })
})
