import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockUpdate = vi.fn()

function makeQuery(result: unknown) {
  const q: Record<string, unknown> = {}
  q.then = (res: (v: unknown) => void) => Promise.resolve(result).then(res)
  q.catch = (rej: (e: unknown) => void) => Promise.resolve(result).catch(rej)
  const chain = () => makeQuery(result)
  q.select = vi.fn(chain)
  q.eq = vi.fn(chain)
  q.single = vi.fn(chain)
  q.update = vi.fn((...args: unknown[]) => { mockUpdate(...args); return makeQuery(result) })
  q.order = vi.fn(chain)
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
vi.mock('@/lib/supabase/actions', () => ({
  resolveOrgMember: vi.fn(),
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('clients actions', () => {
  let resolveOrgMember: ReturnType<typeof vi.fn>
  let updateClientAction: (id: string, updates: { full_name: string; email: string; phone: string; company: string }) => Promise<void>
  let deactivateClientAction: (id: string) => Promise<void>
  let loadClientsAction: () => Promise<unknown[]>

  beforeEach(async () => {
    vi.resetModules()
    fromResults = []
    mockUpdate.mockReset()
    supabaseMock.auth.getUser.mockReset()
    supabaseMock.from.mockClear()

    const actionsModule = await import('@/app/dashboard/clients/actions')
    updateClientAction = actionsModule.updateClientAction
    deactivateClientAction = actionsModule.deactivateClientAction
    loadClientsAction = actionsModule.loadClientsAction

    const actionsHelpers = await import('@/lib/supabase/actions')
    resolveOrgMember = actionsHelpers.resolveOrgMember as ReturnType<typeof vi.fn>
  })

  describe('updateClientAction', () => {
    it('throws when not authenticated', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } })
      await expect(
        updateClientAction('c1', { full_name: 'Ana', email: '', phone: '', company: '' })
      ).rejects.toThrow('Não autenticado')
    })

    it('throws when not org member', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
      resolveOrgMember.mockResolvedValue(null)
      await expect(
        updateClientAction('c1', { full_name: 'Ana', email: '', phone: '', company: '' })
      ).rejects.toThrow('Não autorizado')
    })

    it('throws when client not owned by org', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
      resolveOrgMember.mockResolvedValue({ organization_id: 'org-1' })
      fromResults = [{ data: null, error: null }]
      await expect(
        updateClientAction('c1', { full_name: 'Ana', email: '', phone: '', company: '' })
      ).rejects.toThrow('Cliente não encontrado')
    })

    it('updates client when valid', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
      resolveOrgMember.mockResolvedValue({ organization_id: 'org-1' })
      fromResults = [
        { data: { id: 'c1' }, error: null },
        { data: null, error: null },
      ]
      await expect(
        updateClientAction('c1', { full_name: 'Ana Costa', email: 'ana@example.com', phone: '', company: '' })
      ).resolves.toBeUndefined()
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ full_name: 'Ana Costa' }))
    })

    it('throws when full_name is empty', async () => {
      await expect(
        updateClientAction('c1', { full_name: '  ', email: '', phone: '', company: '' })
      ).rejects.toThrow('Nome obrigatório')
    })
  })

  describe('deactivateClientAction', () => {
    it('sets is_active false on owned client', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
      resolveOrgMember.mockResolvedValue({ organization_id: 'org-1' })
      fromResults = [
        { data: { id: 'c1' }, error: null },
        { data: null, error: null },
      ]
      await deactivateClientAction('c1')
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false })
    })
  })

  describe('loadClientsAction', () => {
    it('returns clients array', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
      resolveOrgMember.mockResolvedValue({ organization_id: 'org-1' })
      fromResults = [{ data: [{ id: 'c1', full_name: 'Ana' }], error: null }]
      const result = await loadClientsAction()
      expect(result).toEqual([{ id: 'c1', full_name: 'Ana' }])
    })
  })
})
