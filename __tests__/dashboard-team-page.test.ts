import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockCreateClient, mockRedirect, mockSingle, mockOrder, mockReturns, mockEq, mockSelect, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateClient: vi.fn(),
  mockRedirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
  mockSingle: vi.fn(),
  mockOrder: vi.fn(),
  mockReturns: vi.fn(),
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
  mockReturns.mockReset()
  mockEq.mockReset()
  mockSelect.mockReset()
  mockFrom.mockReset()

  // team_members: select('organization_id').eq().single()
  // team_members: select('id, full_name, email, role').eq().eq().order()
  // event_team_assignments: select(...).returns()
  mockEq.mockImplementation(() => ({ eq: mockEq, single: mockSingle, order: mockOrder }))
  mockSelect.mockImplementation(() => ({ eq: mockEq, returns: mockReturns }))
  mockFrom.mockImplementation(() => ({ select: mockSelect }))
  mockCreateClient.mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })
  mockReturns.mockResolvedValue({ data: [], error: null })
})

describe('TeamPage', () => {
  it('redirects to /auth/login when there is no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { default: TeamPage } = await import('@/app/dashboard/team/page')

    await expect(TeamPage()).rejects.toThrow('REDIRECT:/auth/login')
  })

  it('redirects to /auth/login when the authenticated user has no team_members row', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSingle.mockResolvedValue({ data: null, error: null })
    const { default: TeamPage } = await import('@/app/dashboard/team/page')

    await expect(TeamPage()).rejects.toThrow('REDIRECT:/auth/login')
  })

  it('shows an empty-state message when the org has no active members', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSingle.mockResolvedValue({ data: { organization_id: 'org-1' }, error: null })
    mockOrder.mockResolvedValue({ data: [], error: null })
    const { default: TeamPage } = await import('@/app/dashboard/team/page')

    const result = await TeamPage()

    expect(JSON.stringify(result)).toContain('Nenhum membro na equipa.')
  })

  it('counts only active/planning events as "eventos ativos", excluding completed/cancelled', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSingle.mockResolvedValue({ data: { organization_id: 'org-1' }, error: null })
    mockOrder.mockResolvedValue({
      data: [{ id: 'member-1', full_name: 'Maria Silva', email: 'maria@example.com', role: 'admin' }],
      error: null,
    })
    mockReturns.mockResolvedValue({
      data: [
        { team_member_id: 'member-1', event: { id: 'ev-1', name: 'Festival Ativo', status: 'active' } },
        { team_member_id: 'member-1', event: { id: 'ev-2', name: 'Festival Planeado', status: 'planning' } },
        { team_member_id: 'member-1', event: { id: 'ev-3', name: 'Festival Antigo', status: 'completed' } },
      ],
      error: null,
    })
    const { default: TeamPage } = await import('@/app/dashboard/team/page')

    const result = await TeamPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Maria Silva')
    // 2 active events (active + planning), not 3
    expect(html).toContain('"text-slate-900 font-bold text-lg","children":2}')
    expect(html).toContain('Festival Ativo')
    expect(html).toContain('Festival Planeado')
    expect(html).toContain('Festival Antigo')
  })

  it('ignores assignments whose joined event is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockSingle.mockResolvedValue({ data: { organization_id: 'org-1' }, error: null })
    mockOrder.mockResolvedValue({
      data: [{ id: 'member-1', full_name: 'Maria Silva', email: 'maria@example.com', role: 'admin' }],
      error: null,
    })
    mockReturns.mockResolvedValue({
      data: [{ team_member_id: 'member-1', event: null }],
      error: null,
    })
    const { default: TeamPage } = await import('@/app/dashboard/team/page')

    const result = await TeamPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Maria Silva')
    expect(html).toContain('"text-slate-900 font-bold text-lg","children":0}')
  })
})
