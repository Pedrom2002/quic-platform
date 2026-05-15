import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInsert = vi.fn()
const mockUpdate = vi.fn()

function makeQuery(result: unknown) {
  const q: Record<string, unknown> = {}
  q.then = (res: (v: unknown) => void) => Promise.resolve(result).then(res)
  q.catch = (rej: (e: unknown) => void) => Promise.resolve(result).catch(rej)
  const chain = () => makeQuery(result)
  q.select = vi.fn(chain)
  q.eq = vi.fn(chain)
  q.single = vi.fn(chain)
  q.order = vi.fn(chain)
  q.insert = vi.fn((...args: unknown[]) => { mockInsert(...args); return makeQuery(result) })
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

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabaseMock),
}))
vi.mock('@/lib/supabase/actions', () => ({
  requireOrgAuth: vi.fn(),
}))

describe('templates actions', () => {
  let requireOrgAuth: ReturnType<typeof vi.fn>
  let loadMessageTemplatesAction: () => Promise<unknown[]>
  let createMessageTemplateAction: (input: { name: string; channel: 'email' | 'whatsapp' | 'sms' | 'portal'; language: 'pt' | 'en'; subject?: string; body_template: string }) => Promise<void>
  let updateMessageTemplateAction: (id: string, input: { name: string; channel: 'email' | 'whatsapp' | 'sms' | 'portal'; language: 'pt' | 'en'; subject?: string; body_template: string }) => Promise<void>
  let deactivateMessageTemplateAction: (id: string) => Promise<void>

  const validInput = {
    name: 'Confirmação',
    channel: 'email' as const,
    language: 'pt' as const,
    subject: 'Olá',
    body_template: 'Olá {{client_name}}',
  }

  const mockMember = { organization_id: 'org-1', role: 'member' }
  const mockUser = { id: 'u1' }

  beforeEach(async () => {
    vi.resetModules()
    fromResults = []
    mockInsert.mockReset()
    mockUpdate.mockReset()
    supabaseMock.from.mockClear()

    const mod = await import('@/app/dashboard/templates/actions')
    loadMessageTemplatesAction = mod.loadMessageTemplatesAction
    createMessageTemplateAction = mod.createMessageTemplateAction
    updateMessageTemplateAction = mod.updateMessageTemplateAction
    deactivateMessageTemplateAction = mod.deactivateMessageTemplateAction

    const helpers = await import('@/lib/supabase/actions')
    requireOrgAuth = helpers.requireOrgAuth as ReturnType<typeof vi.fn>
    requireOrgAuth.mockReset()
  })

  describe('createMessageTemplateAction', () => {
    it('throws on invalid input (empty name)', async () => {
      await expect(
        createMessageTemplateAction({ ...validInput, name: '' })
      ).rejects.toThrow()
    })

    it('throws when not authenticated', async () => {
      requireOrgAuth.mockRejectedValue(new Error('Não autenticado'))
      await expect(createMessageTemplateAction(validInput)).rejects.toThrow('Não autenticado')
    })

    it('throws when not org member', async () => {
      requireOrgAuth.mockRejectedValue(new Error('Não autorizado'))
      await expect(createMessageTemplateAction(validInput)).rejects.toThrow('Não autorizado')
    })

    it('inserts template for org member', async () => {
      requireOrgAuth.mockResolvedValue({ supabase: supabaseMock, user: mockUser, member: mockMember })
      fromResults = [{ data: null, error: null }]
      await createMessageTemplateAction(validInput)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Confirmação', organization_id: 'org-1' })
      )
    })
  })

  describe('updateMessageTemplateAction', () => {
    it('throws when not authenticated', async () => {
      requireOrgAuth.mockRejectedValue(new Error('Não autenticado'))
      await expect(updateMessageTemplateAction('t1', validInput)).rejects.toThrow('Não autenticado')
    })

    it('throws when not org member', async () => {
      requireOrgAuth.mockRejectedValue(new Error('Não autorizado'))
      await expect(updateMessageTemplateAction('t1', validInput)).rejects.toThrow('Não autorizado')
    })

    it('throws when template not owned', async () => {
      requireOrgAuth.mockResolvedValue({ supabase: supabaseMock, user: mockUser, member: mockMember })
      fromResults = [{ data: null, error: null }]
      await expect(updateMessageTemplateAction('t1', validInput)).rejects.toThrow('Template não encontrado')
    })

    it('updates template when owned', async () => {
      requireOrgAuth.mockResolvedValue({ supabase: supabaseMock, user: mockUser, member: mockMember })
      fromResults = [
        { data: { id: 't1' }, error: null },
        { data: null, error: null },
      ]
      await updateMessageTemplateAction('t1', validInput)
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Confirmação' }))
    })
  })

  describe('deactivateMessageTemplateAction', () => {
    it('throws when not authenticated', async () => {
      requireOrgAuth.mockRejectedValue(new Error('Não autenticado'))
      await expect(deactivateMessageTemplateAction('t1')).rejects.toThrow('Não autenticado')
    })

    it('throws when not org member', async () => {
      requireOrgAuth.mockRejectedValue(new Error('Não autorizado'))
      await expect(deactivateMessageTemplateAction('t1')).rejects.toThrow('Não autorizado')
    })

    it('throws when template not owned', async () => {
      requireOrgAuth.mockResolvedValue({ supabase: supabaseMock, user: mockUser, member: mockMember })
      fromResults = [{ data: null, error: null }]
      await expect(deactivateMessageTemplateAction('t1')).rejects.toThrow('Template não encontrado')
    })

    it('sets is_active false', async () => {
      requireOrgAuth.mockResolvedValue({ supabase: supabaseMock, user: mockUser, member: mockMember })
      fromResults = [
        { data: { id: 't1' }, error: null },
        { data: null, error: null },
      ]
      await deactivateMessageTemplateAction('t1')
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false })
    })
  })

  describe('loadMessageTemplatesAction', () => {
    it('returns templates', async () => {
      requireOrgAuth.mockResolvedValue({ supabase: supabaseMock, user: mockUser, member: mockMember })
      fromResults = [{ data: [{ id: 't1', name: 'Confirmação' }], error: null }]
      const result = await loadMessageTemplatesAction()
      expect(result).toEqual([{ id: 't1', name: 'Confirmação' }])
    })
  })
})
