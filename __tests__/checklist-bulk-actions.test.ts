// __tests__/checklist-bulk-actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpdate = vi.fn()
const mockFetch = vi.fn()

function makeQuery(result: unknown) {
  const q: Record<string, unknown> = {}
  q.then = (res: (v: unknown) => void) => Promise.resolve(result).then(res)
  const chain = () => makeQuery(result)
  q.select = vi.fn(chain)
  q.eq = vi.fn(chain)
  q.in = vi.fn(chain)
  q.single = vi.fn(chain)
  q.update = vi.fn((...args: unknown[]) => { mockUpdate(...args); return makeQuery(result) })
  return q
}

let fromResults: unknown[] = []
const supabaseMock = {
  from: vi.fn(() => {
    const result = fromResults.shift() ?? { data: null, error: null }
    return makeQuery(result)
  }),
}

vi.mock('@/lib/supabase/server', () => ({ createClient: () => Promise.resolve(supabaseMock) }))
vi.mock('@/lib/supabase/actions', () => ({ requireOrgAuthFull: vi.fn(), assertEventOwnership: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/notifications/dispatcher', () => ({ dispatchStartNotificationForItem: vi.fn() }))

global.fetch = mockFetch as unknown as typeof fetch

describe('bulkUpdateChecklistStatusAction', () => {
  let bulkUpdateChecklistStatusAction: (eventId: string, ids: string[], status: 'pending' | 'in_progress' | 'completed' | 'skipped') => Promise<void>
  let requireOrgAuthFull: ReturnType<typeof vi.fn>

  const mockMember = { id: 'm1', full_name: 'Test', organization_id: 'org1', role: 'admin' }
  const mockUser = { id: 'u1' }

  beforeEach(async () => {
    vi.resetModules()
    fromResults = []
    mockUpdate.mockReset()
    mockFetch.mockReset()
    supabaseMock.from.mockClear()

    const mod = await import('@/app/dashboard/events/[eventId]/checklist/actions')
    bulkUpdateChecklistStatusAction = mod.bulkUpdateChecklistStatusAction

    const helpers = await import('@/lib/supabase/actions')
    requireOrgAuthFull = helpers.requireOrgAuthFull as ReturnType<typeof vi.fn>
    requireOrgAuthFull.mockReset();
    (helpers.assertEventOwnership as ReturnType<typeof vi.fn>).mockReset()
  })

  it('throws when not authenticated', async () => {
    requireOrgAuthFull.mockRejectedValue(new Error('Não autenticado'))
    await expect(bulkUpdateChecklistStatusAction('e1', ['i1'], 'completed')).rejects.toThrow('Não autenticado')
  })

  it('throws when not org member', async () => {
    requireOrgAuthFull.mockRejectedValue(new Error('Não autorizado'))
    await expect(bulkUpdateChecklistStatusAction('e1', ['i1'], 'completed')).rejects.toThrow('Não autorizado')
  })

  it('throws when event not owned', async () => {
    requireOrgAuthFull.mockResolvedValue({ supabase: supabaseMock, user: mockUser, member: mockMember })
    const helpers = await import('@/lib/supabase/actions')
    ;(helpers.assertEventOwnership as ReturnType<typeof vi.fn>).mockResolvedValue(false)
    await expect(bulkUpdateChecklistStatusAction('e1', ['i1'], 'completed')).rejects.toThrow('Evento não encontrado')
  })

  it('throws when ids array is empty', async () => {
    requireOrgAuthFull.mockResolvedValue({ supabase: supabaseMock, user: mockUser, member: mockMember })
    await expect(bulkUpdateChecklistStatusAction('e1', [], 'completed')).rejects.toThrow('Nenhum item selecionado')
  })

  it('throws when ids array exceeds 50', async () => {
    requireOrgAuthFull.mockResolvedValue({ supabase: supabaseMock, user: mockUser, member: mockMember })
    const manyIds = Array.from({ length: 51 }, (_, i) => `id${i}`)
    await expect(bulkUpdateChecklistStatusAction('e1', manyIds, 'completed')).rejects.toThrow('Máximo 50')
  })

  it('calls update with correct status for valid request', async () => {
    requireOrgAuthFull.mockResolvedValue({ supabase: supabaseMock, user: mockUser, member: mockMember })
    const helpers = await import('@/lib/supabase/actions')
    ;(helpers.assertEventOwnership as ReturnType<typeof vi.fn>).mockResolvedValue(true)
    fromResults = [{ data: null, error: null }] // bulk update
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ item: {} }) })

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminMock = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'ev-1', name: 'Event' } }),
      }),
    }
    vi.mocked(createAdminClient).mockReturnValue(adminMock as never)

    await bulkUpdateChecklistStatusAction('e1', ['i1', 'i2'], 'in_progress')
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'in_progress' }))
  })
})
