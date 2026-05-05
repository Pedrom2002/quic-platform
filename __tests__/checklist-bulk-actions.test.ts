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
  auth: { getUser: vi.fn() },
  from: vi.fn(() => {
    const result = fromResults.shift() ?? { data: null, error: null }
    return makeQuery(result)
  }),
}

vi.mock('@/lib/supabase/server', () => ({ createClient: () => Promise.resolve(supabaseMock) }))
vi.mock('@/lib/supabase/actions', () => ({ resolveOrgMember: vi.fn() }))

global.fetch = mockFetch as unknown as typeof fetch

describe('bulkUpdateChecklistStatusAction', () => {
  let bulkUpdateChecklistStatusAction: (eventId: string, ids: string[], status: string) => Promise<void>
  let resolveOrgMember: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    fromResults = []
    mockUpdate.mockReset()
    mockFetch.mockReset()
    supabaseMock.auth.getUser.mockReset()
    supabaseMock.from.mockClear()

    const mod = await import('@/app/dashboard/events/[eventId]/checklist/actions')
    bulkUpdateChecklistStatusAction = mod.bulkUpdateChecklistStatusAction

    const helpers = await import('@/lib/supabase/actions')
    resolveOrgMember = helpers.resolveOrgMember as ReturnType<typeof vi.fn>
    resolveOrgMember.mockReset()
  })

  it('throws when not authenticated', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } })
    await expect(bulkUpdateChecklistStatusAction('e1', ['i1'], 'completed')).rejects.toThrow('Não autenticado')
  })

  it('throws when not org member', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue(null)
    await expect(bulkUpdateChecklistStatusAction('e1', ['i1'], 'completed')).rejects.toThrow('Não autorizado')
  })

  it('throws when event not owned', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org1' })
    fromResults = [{ data: null, error: null }]
    await expect(bulkUpdateChecklistStatusAction('e1', ['i1'], 'completed')).rejects.toThrow('Evento não encontrado')
  })

  it('throws when ids array is empty', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org1' })
    await expect(bulkUpdateChecklistStatusAction('e1', [], 'completed')).rejects.toThrow('Nenhum item selecionado')
  })

  it('calls update with correct status for valid request', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org1' })
    fromResults = [
      { data: { id: 'e1' }, error: null }, // event ownership check
      { data: null, error: null },           // bulk update
    ]
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ item: {} }) })
    await bulkUpdateChecklistStatusAction('e1', ['i1', 'i2'], 'in_progress')
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'in_progress' }))
  })
})
