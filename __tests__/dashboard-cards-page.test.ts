import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockCreateClient, mockRedirect, mockSingle, mockOrder, mockEq, mockSelect, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateClient: vi.fn(),
  mockRedirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
  mockSingle: vi.fn(),
  mockOrder: vi.fn(),
  mockEq: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))
vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    ({ type: 'a', props: { href, ...props, children } }),
}))

beforeEach(() => {
  mockGetUser.mockReset()
  mockCreateClient.mockReset()
  mockRedirect.mockClear()
  mockSingle.mockReset()
  mockOrder.mockReset()
  mockEq.mockReset()
  mockSelect.mockReset()
  mockFrom.mockReset()

  // team_members select('organization_id').eq().single()  -> resolves via mockSingle
  // team_members select('id, full_name, email, role').eq().eq().order() -> resolves via mockOrder
  mockEq.mockImplementation(() => ({ eq: mockEq, single: mockSingle, order: mockOrder }))
  mockSelect.mockImplementation(() => ({ eq: mockEq }))
  mockFrom.mockImplementation(() => ({ select: mockSelect }))
  mockCreateClient.mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })
})

describe('CardsPage', () => {
  it('redirects to /auth/login when there is no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { default: CardsPage } = await import('@/app/dashboard/cards/page')

    await expect(CardsPage()).rejects.toThrow('REDIRECT:/auth/login')
  })

  it('redirects to /auth/login when the authenticated user has no team_members row', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSingle.mockResolvedValue({ data: null, error: null })
    const { default: CardsPage } = await import('@/app/dashboard/cards/page')

    await expect(CardsPage()).rejects.toThrow('REDIRECT:/auth/login')
  })

  it('shows an empty-state message when the org has no active members', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSingle.mockResolvedValue({ data: { organization_id: 'org-1' }, error: null })
    mockOrder.mockResolvedValue({ data: [], error: null })
    const { default: CardsPage } = await import('@/app/dashboard/cards/page')

    const result = await CardsPage()

    expect(JSON.stringify(result)).toContain('Nenhum membro na equipa.')
  })

  it('renders a card link per active member with initials and role label', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSingle.mockResolvedValue({ data: { organization_id: 'org-1' }, error: null })
    mockOrder.mockResolvedValue({
      data: [
        { id: 'member-1', full_name: 'Maria Silva', email: 'maria@example.com', role: 'admin' },
      ],
      error: null,
    })
    const { default: CardsPage } = await import('@/app/dashboard/cards/page')

    const result = await CardsPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Maria Silva')
    expect(html).toContain('maria@example.com')
    expect(html).toContain('Admin')
    expect(html).toContain('/dashboard/cards/member-1')
  })
})
