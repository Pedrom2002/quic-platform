// __tests__/checklist-reorder.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpdate = vi.fn()

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

describe('reorderChecklistItemsAction', () => {
  let reorderChecklistItemsAction: (eventId: string, orderedIds: string[]) => Promise<void>
  let resolveOrgMember: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    fromResults = []
    mockUpdate.mockReset()
    supabaseMock.auth.getUser.mockReset()
    supabaseMock.from.mockClear()

    const mod = await import('@/app/dashboard/events/[eventId]/checklist/actions')
    reorderChecklistItemsAction = mod.reorderChecklistItemsAction

    const helpers = await import('@/lib/supabase/actions')
    resolveOrgMember = helpers.resolveOrgMember as ReturnType<typeof vi.fn>
    resolveOrgMember.mockReset()
  })

  it('throws when not authenticated', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } })
    await expect(reorderChecklistItemsAction('e1', ['i1'])).rejects.toThrow('Não autenticado')
  })

  it('throws when not org member', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue(null)
    await expect(reorderChecklistItemsAction('e1', ['i1'])).rejects.toThrow('Não autorizado')
  })

  it('throws when orderedIds is empty', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org1' })
    await expect(reorderChecklistItemsAction('e1', [])).rejects.toThrow('Nenhum item')
  })

  it('throws when orderedIds exceeds 200', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org1' })
    const ids = Array.from({ length: 201 }, (_, i) => `id${i}`)
    await expect(reorderChecklistItemsAction('e1', ids)).rejects.toThrow('Máximo')
  })

  it('throws when event not owned', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org1' })
    fromResults = [{ data: null, error: null }]
    await expect(reorderChecklistItemsAction('e1', ['i1'])).rejects.toThrow('Evento não encontrado')
  })

  it('calls update with correct position for each id', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    resolveOrgMember.mockResolvedValue({ organization_id: 'org1' })
    fromResults = [
      { data: { id: 'e1' }, error: null }, // event ownership check
      { data: null, error: null },           // update id1
      { data: null, error: null },           // update id2
    ]
    await reorderChecklistItemsAction('e1', ['id1', 'id2'])
    expect(mockUpdate).toHaveBeenCalledWith({ position: 10 })
    expect(mockUpdate).toHaveBeenCalledWith({ position: 20 })
  })
})
