import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockSelect, mockCreateClient } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSelect: vi.fn(),
  mockCreateClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
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
  mockCreateClient.mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue({ select: mockSelect }),
  })
})

describe('getInvestorProfile', () => {
  it('returns authenticated: false when there is no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { getInvestorProfile } = await import('@/lib/investors/get-profile')

    expect(await getInvestorProfile()).toEqual({ authenticated: false })
  })

  it('returns authenticated: true, profile: null when there is no investors row for the user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSelect.mockReturnValue(makeSelectChain(null))
    const { getInvestorProfile } = await import('@/lib/investors/get-profile')

    expect(await getInvestorProfile()).toEqual({ authenticated: true, profile: null })
  })

  it('returns the profile when the investor row exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSelect.mockReturnValue(makeSelectChain({ full_name: 'Maria Silva', phone: '912345678', email: 'maria@example.com', status: 'pending' }))
    const { getInvestorProfile } = await import('@/lib/investors/get-profile')

    expect(await getInvestorProfile()).toEqual({
      authenticated: true,
      profile: {
        userId: 'user-1',
        fullName: 'Maria Silva',
        phone: '912345678',
        email: 'maria@example.com',
        status: 'pending',
      },
    })
  })
})
