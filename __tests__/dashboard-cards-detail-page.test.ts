import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockCreateClient, mockRedirect, mockNotFound, mockSingle, mockEq, mockSelect, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateClient: vi.fn(),
  mockRedirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
  mockNotFound: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
  mockSingle: vi.fn(),
  mockEq: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))
vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
  notFound: mockNotFound,
}))

beforeEach(() => {
  mockGetUser.mockReset()
  mockCreateClient.mockReset()
  mockRedirect.mockClear()
  mockNotFound.mockClear()
  mockSingle.mockReset()
  mockEq.mockReset()
  mockSelect.mockReset()
  mockFrom.mockReset()

  // Both queries in this page end in .eq(...).eq(...).single() or .eq(...).single()
  mockEq.mockImplementation(() => ({ eq: mockEq, single: mockSingle }))
  mockSelect.mockImplementation(() => ({ eq: mockEq }))
  mockFrom.mockImplementation(() => ({ select: mockSelect }))
  mockCreateClient.mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })
})

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('MemberCardPage', () => {
  it('redirects to /auth/login when there is no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { default: MemberCardPage } = await import('@/app/dashboard/cards/[id]/page')

    await expect(MemberCardPage(paramsFor('member-1'))).rejects.toThrow('REDIRECT:/auth/login')
  })

  it('calls notFound when the requested member does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSingle.mockResolvedValueOnce({ data: null, error: null })
    const { default: MemberCardPage } = await import('@/app/dashboard/cards/[id]/page')

    await expect(MemberCardPage(paramsFor('member-1'))).rejects.toThrow('NOT_FOUND')
  })

  it('calls notFound when the viewer belongs to a different organization than the member', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSingle
      .mockResolvedValueOnce({
        data: { id: 'member-1', full_name: 'Maria Silva', email: 'maria@example.com', role: 'admin', organization_id: 'org-A' },
        error: null,
      })
      .mockResolvedValueOnce({ data: { organization_id: 'org-B' }, error: null })
    const { default: MemberCardPage } = await import('@/app/dashboard/cards/[id]/page')

    await expect(MemberCardPage(paramsFor('member-1'))).rejects.toThrow('NOT_FOUND')
  })

  it('renders the card for a member in the viewer\'s own organization', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSingle
      .mockResolvedValueOnce({
        data: { id: 'member-1', full_name: 'Maria Silva', email: 'maria@example.com', role: 'admin', organization_id: 'org-A' },
        error: null,
      })
      .mockResolvedValueOnce({ data: { organization_id: 'org-A' }, error: null })
    const { default: MemberCardPage } = await import('@/app/dashboard/cards/[id]/page')

    const result = await MemberCardPage(paramsFor('member-1'))
    const html = JSON.stringify(result)

    expect(mockNotFound).not.toHaveBeenCalled()
    expect(html).toContain('Maria Silva')
    expect(html).toContain('mailto:maria@example.com')
  })
})
