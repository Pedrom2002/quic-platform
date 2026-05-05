import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockSendEmail = vi.fn().mockResolvedValue('msg-1')
const mockBuildEmailHtml = vi.fn().mockReturnValue('<html/>')

vi.mock('@/lib/notifications/channels/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  buildEmailHtml: (...args: unknown[]) => mockBuildEmailHtml(...args),
}))
vi.mock('@/lib/supabase/actions', () => ({
  resolveOrgMember: vi.fn(),
}))

function makeQuery(result: unknown) {
  const q: Record<string, unknown> = {}
  q.then = (res: (v: unknown) => void) => Promise.resolve(result).then(res)
  q.catch = (rej: (e: unknown) => void) => Promise.resolve(result).catch(rej)
  const chain = () => makeQuery(result)
  q.select = vi.fn(chain)
  q.eq = vi.fn(chain)
  q.single = vi.fn(chain)
  return q
}

let fromResults: unknown[] = []
const supabaseMock = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => {
    const result = fromResults.shift() ?? { data: null, error: null }
    return makeQuery(result)
  }),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabaseMock),
}))

const PORTAL_URL = 'https://app.example.com'

describe('sendPortalLinkAction', () => {
  let resolveOrgMember: ReturnType<typeof vi.fn>
  let sendPortalLinkAction: (eventId: string) => Promise<void>

  beforeEach(async () => {
    vi.resetModules()
    fromResults = []
    mockSendEmail.mockReset()
    mockSendEmail.mockResolvedValue('msg-1')
    mockBuildEmailHtml.mockReset()
    mockBuildEmailHtml.mockReturnValue('<html/>')
    supabaseMock.auth.getUser.mockReset()
    supabaseMock.from.mockClear()
    process.env.NEXT_PUBLIC_APP_URL = PORTAL_URL
    delete process.env.NEXT_PUBLIC_PORTAL_URL

    const mod = await import('@/app/dashboard/events/[eventId]/actions')
    sendPortalLinkAction = mod.sendPortalLinkAction

    const helpers = await import('@/lib/supabase/actions')
    resolveOrgMember = helpers.resolveOrgMember as ReturnType<typeof vi.fn>
    resolveOrgMember.mockReset()
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = PORTAL_URL
    delete process.env.NEXT_PUBLIC_PORTAL_URL
  })

  it('throws when NEXT_PUBLIC_APP_URL missing', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.NEXT_PUBLIC_PORTAL_URL
    await expect(sendPortalLinkAction('e1')).rejects.toThrow('não configurado')
  })

  it('throws when not authenticated', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } })
    await expect(sendPortalLinkAction('e1')).rejects.toThrow('Não autenticado')
  })

  it('throws when not org member', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue(null)
    await expect(sendPortalLinkAction('e1')).rejects.toThrow('Não autorizado')
  })

  it('throws when event not found', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org-1' })
    fromResults = [{ data: null, error: null }]
    await expect(sendPortalLinkAction('e1')).rejects.toThrow('Evento não encontrado')
  })

  it('throws when no clients with email', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org-1' })
    fromResults = [
      { data: { id: 'e1', name: 'Concerto', portal_token: 'tok123', organization_id: 'org-1' }, error: null },
      {
        data: [
          { notification_prefs: { channels: ['email'] }, opted_out: false, client: { full_name: 'Ana', email: null } },
        ],
        error: null,
      },
    ]
    await expect(sendPortalLinkAction('e1')).rejects.toThrow('Nenhum cliente com email')
  })

  it('sends email to eligible clients', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org-1' })
    fromResults = [
      { data: { id: 'e1', name: 'Concerto', portal_token: 'tok123', organization_id: 'org-1' }, error: null },
      {
        data: [
          { notification_prefs: { channels: ['email'] }, opted_out: false, client: { full_name: 'Ana', email: 'ana@example.com' } },
        ],
        error: null,
      },
    ]
    await sendPortalLinkAction('e1')
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ana@example.com',
        subject: expect.stringContaining('Concerto'),
      })
    )
  })

  it('includes portal token in URL passed to email builder', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org-1' })
    fromResults = [
      { data: { id: 'e1', name: 'Concerto', portal_token: 'tok123', organization_id: 'org-1' }, error: null },
      {
        data: [
          { notification_prefs: { channels: ['email'] }, opted_out: false, client: { full_name: 'Ana', email: 'ana@example.com' } },
        ],
        error: null,
      },
    ]
    await sendPortalLinkAction('e1')
    const emailBody: string = mockBuildEmailHtml.mock.calls[0][0]
    expect(emailBody).toContain(`${PORTAL_URL}/portal/tok123`)
  })
})
