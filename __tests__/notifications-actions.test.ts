import { describe, it, expect, vi, beforeEach } from 'vitest'

function makeQuery(result: unknown) {
  const q: Record<string, unknown> = {}
  q.then = (res: (v: unknown) => void) => Promise.resolve(result).then(res)
  const chain = () => makeQuery(result)
  q.select = vi.fn(chain)
  q.eq = vi.fn(chain)
  q.single = vi.fn(chain)
  return q
}

let adminFromResults: unknown[] = []
const adminSupabaseMock = {
  from: vi.fn(() => {
    const result = adminFromResults.shift() ?? { data: null, error: null }
    return makeQuery(result)
  }),
}

const mockDispatchClientUpdate = vi.fn()

vi.mock('@/lib/supabase/actions', () => ({ requireOrgAuthFull: vi.fn(), assertEventOwnership: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => adminSupabaseMock }))
vi.mock('@/lib/notifications/dispatcher', () => ({
  dispatchClientUpdate: (...args: unknown[]) => mockDispatchClientUpdate(...args),
}))

describe('sendClientUpdateAction', () => {
  let sendClientUpdateAction: (eventId: string, message: string) => Promise<{ sent: number }>
  let requireOrgAuthFull: ReturnType<typeof vi.fn>
  let assertEventOwnership: ReturnType<typeof vi.fn>

  const mockMember = { id: 'm1', full_name: 'Rui', organization_id: 'org-1', role: 'admin' }
  const mockUser = { id: 'u1' }
  const mockEventRow = { id: 'event-1', organization_id: 'org-1', name: 'Concerto Teste', portal_token: 'tok', start_datetime: '2026-06-01T20:00:00Z' }

  beforeEach(async () => {
    vi.resetModules()
    adminFromResults = []
    mockDispatchClientUpdate.mockReset()
    adminSupabaseMock.from.mockClear()

    const mod = await import('@/app/dashboard/events/[eventId]/notifications/actions')
    sendClientUpdateAction = mod.sendClientUpdateAction

    const helpers = await import('@/lib/supabase/actions')
    requireOrgAuthFull = helpers.requireOrgAuthFull as ReturnType<typeof vi.fn>
    assertEventOwnership = helpers.assertEventOwnership as ReturnType<typeof vi.fn>
    requireOrgAuthFull.mockReset()
    assertEventOwnership.mockReset()
  })

  it('throws when not authenticated', async () => {
    requireOrgAuthFull.mockRejectedValue(new Error('Não autenticado'))
    await expect(sendClientUpdateAction('event-1', 'Desmontagens em curso.')).rejects.toThrow('Não autenticado')
  })

  it('throws when message is empty', async () => {
    requireOrgAuthFull.mockResolvedValue({ supabase: {}, user: mockUser, member: mockMember })
    await expect(sendClientUpdateAction('event-1', '   ')).rejects.toThrow('Mensagem obrigatória')
  })

  it('throws when message exceeds 2000 characters', async () => {
    requireOrgAuthFull.mockResolvedValue({ supabase: {}, user: mockUser, member: mockMember })
    await expect(sendClientUpdateAction('event-1', 'a'.repeat(2001))).rejects.toThrow('Mensagem demasiado longa')
  })

  it('throws when event does not belong to the organization', async () => {
    requireOrgAuthFull.mockResolvedValue({ supabase: {}, user: mockUser, member: mockMember })
    assertEventOwnership.mockResolvedValue(false)
    await expect(sendClientUpdateAction('event-1', 'Desmontagens em curso.')).rejects.toThrow('Evento não encontrado')
  })

  it('calls dispatchClientUpdate with the trimmed message and returns sent count', async () => {
    requireOrgAuthFull.mockResolvedValue({ supabase: {}, user: mockUser, member: mockMember })
    assertEventOwnership.mockResolvedValue(true)
    adminFromResults = [{ data: mockEventRow, error: null }]
    mockDispatchClientUpdate.mockResolvedValue({ sent: 3 })

    const result = await sendClientUpdateAction('event-1', '  Desmontagens em curso.  ')

    expect(result).toEqual({ sent: 3 })
    expect(mockDispatchClientUpdate).toHaveBeenCalledWith({
      event: mockEventRow,
      customMessage: 'Desmontagens em curso.',
    })
  })

  it('throws when event lookup returns nothing', async () => {
    requireOrgAuthFull.mockResolvedValue({ supabase: {}, user: mockUser, member: mockMember })
    assertEventOwnership.mockResolvedValue(true)
    adminFromResults = [{ data: null, error: null }]

    await expect(sendClientUpdateAction('event-1', 'Desmontagens em curso.')).rejects.toThrow('Evento não encontrado')
  })
})
