// __tests__/checklist-reorder.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpdate = vi.fn()
const mockUpsert = vi.fn()

function makeQuery(result: unknown) {
  const q: Record<string, unknown> = {}
  q.then = (res: (v: unknown) => void) => Promise.resolve(result).then(res)
  const chain = () => makeQuery(result)
  q.select = vi.fn(chain)
  q.eq = vi.fn(chain)
  q.in = vi.fn(chain)
  q.single = vi.fn(chain)
  q.update = vi.fn((...args: unknown[]) => { mockUpdate(...args); return makeQuery(result) })
  q.upsert = vi.fn((...args: unknown[]) => { mockUpsert(...args); return makeQuery(result) })
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
vi.mock('@/lib/supabase/actions', () => ({ requireOrgAuth: vi.fn(), assertEventOwnership: vi.fn() }))

describe('reorderChecklistItemsAction', () => {
  let reorderChecklistItemsAction: (eventId: string, orderedIds: string[]) => Promise<void>
  let requireOrgAuth: ReturnType<typeof vi.fn>

  const mockMember = { organization_id: 'org1', role: 'member' }
  const mockUser = { id: 'u1' }

  beforeEach(async () => {
    vi.resetModules()
    fromResults = []
    mockUpdate.mockReset()
    supabaseMock.from.mockClear()

    const mod = await import('@/app/dashboard/events/[eventId]/checklist/actions')
    reorderChecklistItemsAction = mod.reorderChecklistItemsAction

    const helpers = await import('@/lib/supabase/actions')
    requireOrgAuth = helpers.requireOrgAuth as ReturnType<typeof vi.fn>
    requireOrgAuth.mockReset();
    (helpers.assertEventOwnership as ReturnType<typeof vi.fn>).mockReset()
  })

  it('throws when not authenticated', async () => {
    requireOrgAuth.mockRejectedValue(new Error('Não autenticado'))
    await expect(reorderChecklistItemsAction('e1', ['i1'])).rejects.toThrow('Não autenticado')
  })

  it('throws when not org member', async () => {
    requireOrgAuth.mockRejectedValue(new Error('Não autorizado'))
    await expect(reorderChecklistItemsAction('e1', ['i1'])).rejects.toThrow('Não autorizado')
  })

  it('throws when orderedIds is empty', async () => {
    requireOrgAuth.mockResolvedValue({ supabase: supabaseMock, user: mockUser, member: mockMember })
    await expect(reorderChecklistItemsAction('e1', [])).rejects.toThrow('Nenhum item')
  })

  it('throws when orderedIds exceeds 200', async () => {
    requireOrgAuth.mockResolvedValue({ supabase: supabaseMock, user: mockUser, member: mockMember })
    const ids = Array.from({ length: 201 }, (_, i) => `id${i}`)
    await expect(reorderChecklistItemsAction('e1', ids)).rejects.toThrow('Máximo')
  })

  it('throws when event not owned', async () => {
    requireOrgAuth.mockResolvedValue({ supabase: supabaseMock, user: mockUser, member: mockMember })
    const helpers = await import('@/lib/supabase/actions')
    ;(helpers.assertEventOwnership as ReturnType<typeof vi.fn>).mockResolvedValue(false)
    await expect(reorderChecklistItemsAction('e1', ['i1'])).rejects.toThrow('Evento não encontrado')
  })

  it('calls upsert with correct positions for each id', async () => {
    requireOrgAuth.mockResolvedValue({ supabase: supabaseMock, user: mockUser, member: mockMember })
    const helpers = await import('@/lib/supabase/actions')
    ;(helpers.assertEventOwnership as ReturnType<typeof vi.fn>).mockResolvedValue(true)
    // Validation SELECT returns both IDs as valid for this event
    fromResults = [
      { data: [{ id: 'id1' }, { id: 'id2' }], error: null },
    ]
    mockUpsert.mockReset()
    await reorderChecklistItemsAction('e1', ['id1', 'id2'])
    expect(mockUpsert).toHaveBeenCalledWith(
      [{ id: 'id1', position: 10 }, { id: 'id2', position: 20 }],
      { onConflict: 'id' }
    )
  })
})
