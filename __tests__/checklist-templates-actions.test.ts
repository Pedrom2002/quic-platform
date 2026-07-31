// __tests__/checklist-templates-actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOrgAuth, mockRequireOrgAuthFull, mockAssertOwnership } = vi.hoisted(() => ({
  mockRequireOrgAuth: vi.fn(),
  mockRequireOrgAuthFull: vi.fn(),
  mockAssertOwnership: vi.fn(),
}))

vi.mock('@/lib/supabase/actions', () => ({
  requireOrgAuth: mockRequireOrgAuth,
  requireOrgAuthFull: mockRequireOrgAuthFull,
  assertEventOwnership: mockAssertOwnership,
}))

const EVENT = '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b'
const MEMBER = { organization_id: 'org-1', role: 'member' }
const MEMBER_FULL = { id: 'tm-1', full_name: 'Ana', organization_id: 'org-1', role: 'member' }

function chain(result: unknown, calls?: { inserts?: unknown[] }) {
  const c: Record<string, unknown> = {}
  const self = () => c
  for (const m of ['select', 'eq', 'order', 'limit', 'returns', 'single']) {
    c[m] = vi.fn(self)
  }
  c.insert = vi.fn((payload: unknown) => {
    calls?.inserts?.push(payload)
    return c
  })
  ;(c as { then?: unknown }).then = (resolve: (v: unknown) => void) => resolve(result)
  return c
}

function makeSupabase() {
  const from = vi.fn()
  return { supabase: { from }, from }
}

function authAs(supabase: unknown) {
  const auth = { supabase, user: { id: 'user-1' }, member: MEMBER }
  mockRequireOrgAuth.mockResolvedValue(auth)
  return auth
}

function authFullAs(supabase: unknown) {
  const auth = { supabase, user: { id: 'user-1' }, member: MEMBER_FULL }
  mockRequireOrgAuthFull.mockResolvedValue(auth)
  return auth
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAssertOwnership.mockResolvedValue(true)
})

describe('seedChecklistTasksAction', () => {
  it('propagates auth failure (throws)', async () => {
    mockRequireOrgAuth.mockRejectedValue(new Error('Não autenticado'))
    const { seedChecklistTasksAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-templates'
    )
    await expect(seedChecklistTasksAction(EVENT)).rejects.toThrow('Não autenticado')
  })

  it('throws when event is not owned by the org', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    mockAssertOwnership.mockResolvedValue(false)
    const { seedChecklistTasksAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-templates'
    )
    await expect(seedChecklistTasksAction(EVENT)).rejects.toThrow('Evento não encontrado')
  })

  it('inserts all seed items scoped to event when none exist yet', async () => {
    const inserts: unknown[] = []
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    from
      .mockReturnValueOnce(chain({ data: [] })) // existing items
      .mockReturnValueOnce(chain({ error: null }, { inserts })) // insert
    const { seedChecklistTasksAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-templates'
    )
    const result = await seedChecklistTasksAction(EVENT)
    expect(result.inserted).toBeGreaterThan(0)
    const rows = inserts[0] as Record<string, unknown>[]
    expect(rows.length).toBe(result.inserted)
    for (const row of rows) {
      expect(row.event_id).toBe(EVENT)
      expect(row.status).toBe('pending')
      expect(row.is_client_visible).toBe(true)
    }
  })

  it('does not duplicate items already seeded (skips existing title+category)', async () => {
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    const { seedChecklistTasksAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-templates'
    )

    // First pass: seed from empty, capture what got inserted.
    const seedInserts: unknown[] = []
    from
      .mockReturnValueOnce(chain({ data: [] }))
      .mockReturnValueOnce(chain({ error: null }, { inserts: seedInserts }))
    await seedChecklistTasksAction(EVENT)
    const seededRows = seedInserts[0] as Record<string, unknown>[]

    // Second pass: simulate that all those items already exist in the DB.
    const existing = seededRows.map((r) => ({
      title: r.title,
      category: r.category,
      position: r.position,
    }))
    from.mockReset()
    from.mockReturnValueOnce(chain({ data: existing }))
    const result = await seedChecklistTasksAction(EVENT)
    expect(result).toEqual({ inserted: 0 })
    // Only the existing-items SELECT should have been called; no insert call follows.
    expect(from).toHaveBeenCalledTimes(1)
  })

  it('positions new items after existing max position per category', async () => {
    const inserts: unknown[] = []
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    from
      .mockReturnValueOnce(
        chain({ data: [{ title: 'Outro', category: 'Estruturas', position: 5 }] })
      )
      .mockReturnValueOnce(chain({ error: null }, { inserts }))
    const { seedChecklistTasksAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-templates'
    )
    await seedChecklistTasksAction(EVENT)
    const rows = inserts[0] as Record<string, unknown>[]
    const estruturasRows = rows.filter((r) => r.category === 'Estruturas')
    // First new "Estruturas" item should continue from position 6 onward
    expect(estruturasRows[0].position).toBe(6)
    expect(estruturasRows[1].position).toBe(7)
  })

  it('returns inserted: 0 without calling insert when nothing to add', async () => {
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    // First pass to discover all seed item keys
    const seedInserts: unknown[] = []
    from
      .mockReturnValueOnce(chain({ data: [] }))
      .mockReturnValueOnce(chain({ error: null }, { inserts: seedInserts }))
    const { seedChecklistTasksAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-templates'
    )
    await seedChecklistTasksAction(EVENT)
    const seededRows = seedInserts[0] as Record<string, unknown>[]

    from.mockReset()
    const existing = seededRows.map((r) => ({
      title: r.title,
      category: r.category,
      position: r.position,
    }))
    from.mockReturnValueOnce(chain({ data: existing }))
    const result = await seedChecklistTasksAction(EVENT)
    expect(result).toEqual({ inserted: 0 })
  })

  it('throws with the supabase error message when insert fails', async () => {
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    from
      .mockReturnValueOnce(chain({ data: [] }))
      .mockReturnValueOnce(chain({ error: { message: 'insert failed' } }))
    const { seedChecklistTasksAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-templates'
    )
    await expect(seedChecklistTasksAction(EVENT)).rejects.toThrow('insert failed')
  })
})

describe('syncCategoriesToTemplateAction', () => {
  it('propagates auth failure (throws)', async () => {
    mockRequireOrgAuthFull.mockRejectedValue(new Error('Não autenticado'))
    const { syncCategoriesToTemplateAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-templates'
    )
    await expect(syncCategoriesToTemplateAction(EVENT)).rejects.toThrow('Não autenticado')
  })

  it('throws when event not found (org-scoped lookup misses)', async () => {
    const { supabase, from } = makeSupabase()
    authFullAs(supabase)
    from.mockReturnValueOnce(chain({ data: null }))
    const { syncCategoriesToTemplateAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-templates'
    )
    await expect(syncCategoriesToTemplateAction(EVENT)).rejects.toThrow('Evento não encontrado')
  })

  it('throws when event has no event_type_id', async () => {
    const { supabase, from } = makeSupabase()
    authFullAs(supabase)
    from.mockReturnValueOnce(chain({ data: { id: EVENT, event_type_id: null } }))
    const { syncCategoriesToTemplateAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-templates'
    )
    await expect(syncCategoriesToTemplateAction(EVENT)).rejects.toThrow('Evento sem tipo definido')
  })

  it('event lookup is scoped to organization_id', async () => {
    const { supabase, from } = makeSupabase()
    authFullAs(supabase)
    const eventChain = chain({ data: { id: EVENT, event_type_id: 'et-1' } })
    const templateChain = chain({ data: { id: 'tpl-1' } })
    const existingItemsChain = chain({ data: [] })
    const insertChain = chain({ error: null }, { inserts: [] })
    from
      .mockReturnValueOnce(eventChain)
      .mockReturnValueOnce(templateChain)
      .mockReturnValueOnce(existingItemsChain)
      .mockReturnValueOnce(insertChain)
    const { syncCategoriesToTemplateAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-templates'
    )
    await syncCategoriesToTemplateAction(EVENT)
    expect(eventChain.eq).toHaveBeenCalledWith('id', EVENT)
    expect(eventChain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
  })

  it('creates a new active template when none exists, then inserts seed items', async () => {
    const templateInserts: unknown[] = []
    const itemInserts: unknown[] = []
    const { supabase, from } = makeSupabase()
    authFullAs(supabase)
    from
      .mockReturnValueOnce(chain({ data: { id: EVENT, event_type_id: 'et-1' } })) // event
      .mockReturnValueOnce(chain({ data: null })) // no active template found
      .mockReturnValueOnce(chain({ data: { id: 'tpl-new' }, error: null }, { inserts: templateInserts })) // create template
      .mockReturnValueOnce(chain({ data: [] })) // existing template items
      .mockReturnValueOnce(chain({ error: null }, { inserts: itemInserts })) // insert items
    const { syncCategoriesToTemplateAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-templates'
    )
    const result = await syncCategoriesToTemplateAction(EVENT)
    expect(result.inserted).toBeGreaterThan(0)
    const tplInsert = templateInserts[0] as Record<string, unknown>
    expect(tplInsert.organization_id).toBe('org-1')
    expect(tplInsert.event_type_id).toBe('et-1')
    expect(tplInsert.is_active).toBe(true)
    expect(tplInsert.created_by).toBe('tm-1')
    const rows = itemInserts[0] as Record<string, unknown>[]
    for (const row of rows) {
      expect(row.template_id).toBe('tpl-new')
    }
  })

  it('throws when template creation fails', async () => {
    const { supabase, from } = makeSupabase()
    authFullAs(supabase)
    from
      .mockReturnValueOnce(chain({ data: { id: EVENT, event_type_id: 'et-1' } }))
      .mockReturnValueOnce(chain({ data: null }))
      .mockReturnValueOnce(chain({ data: null, error: { message: 'boom' } }))
    const { syncCategoriesToTemplateAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-templates'
    )
    await expect(syncCategoriesToTemplateAction(EVENT)).rejects.toThrow('Erro ao criar template')
  })

  it('reuses existing active template and skips already-synced items', async () => {
    const { supabase, from } = makeSupabase()
    authFullAs(supabase)
    // Discover full seed set first via a clean run against an empty template.
    const seedInserts: unknown[] = []
    from
      .mockReturnValueOnce(chain({ data: { id: EVENT, event_type_id: 'et-1' } }))
      .mockReturnValueOnce(chain({ data: { id: 'tpl-1' } }))
      .mockReturnValueOnce(chain({ data: [] }))
      .mockReturnValueOnce(chain({ error: null }, { inserts: seedInserts }))
    const { syncCategoriesToTemplateAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-templates'
    )
    await syncCategoriesToTemplateAction(EVENT)
    const seededRows = seedInserts[0] as Record<string, unknown>[]

    // Now simulate all items already exist in the template.
    const existingItems = seededRows.map((r) => ({
      title: r.title,
      category: r.category,
      position: r.position,
    }))
    from.mockReset()
    from
      .mockReturnValueOnce(chain({ data: { id: EVENT, event_type_id: 'et-1' } }))
      .mockReturnValueOnce(chain({ data: { id: 'tpl-1' } }))
      .mockReturnValueOnce(chain({ data: existingItems }))
    const result = await syncCategoriesToTemplateAction(EVENT)
    expect(result).toEqual({ inserted: 0 })
  })

  it('calculates positions per category across at least 2 categories', async () => {
    const itemInserts: unknown[] = []
    const { supabase, from } = makeSupabase()
    authFullAs(supabase)
    from
      .mockReturnValueOnce(chain({ data: { id: EVENT, event_type_id: 'et-1' } })) // event
      .mockReturnValueOnce(chain({ data: { id: 'tpl-1' } })) // active template found
      .mockReturnValueOnce(
        chain({
          data: [
            { title: 'X', category: 'Estruturas', position: 3 },
            { title: 'Y', category: 'Sistema de Som', position: 1 },
          ],
        })
      ) // existing template items
      .mockReturnValueOnce(chain({ error: null }, { inserts: itemInserts })) // insert
    const { syncCategoriesToTemplateAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-templates'
    )
    await syncCategoriesToTemplateAction(EVENT)
    const rows = itemInserts[0] as Record<string, unknown>[]
    const estruturasRows = rows.filter((r) => r.category === 'Estruturas')
    const somRows = rows.filter((r) => r.category === 'Sistema de Som')
    expect(estruturasRows[0].position).toBe(4)
    expect(estruturasRows[1].position).toBe(5)
    expect(somRows[0].position).toBe(2)
    expect(somRows[1].position).toBe(3)
  })

  it('throws with the supabase error message when item insert fails', async () => {
    const { supabase, from } = makeSupabase()
    authFullAs(supabase)
    from
      .mockReturnValueOnce(chain({ data: { id: EVENT, event_type_id: 'et-1' } }))
      .mockReturnValueOnce(chain({ data: { id: 'tpl-1' } }))
      .mockReturnValueOnce(chain({ data: [] }))
      .mockReturnValueOnce(chain({ error: { message: 'insert failed' } }))
    const { syncCategoriesToTemplateAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-templates'
    )
    await expect(syncCategoriesToTemplateAction(EVENT)).rejects.toThrow('insert failed')
  })
})
