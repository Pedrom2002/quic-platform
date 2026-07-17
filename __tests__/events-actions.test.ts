import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockRequireOrgAuth,
  mockRequireOrgAuthFull,
  mockGetOrgAuth,
  mockGetOrgAuthFull,
  mockAssertOwnership,
  mockRevalidate,
  mockAudit,
  mockAfter,
  mockDispatchArticle,
  mockAdminFrom,
  mockDel,
  mockPut,
} = vi.hoisted(() => ({
  mockRequireOrgAuth: vi.fn(),
  mockRequireOrgAuthFull: vi.fn(),
  mockGetOrgAuth: vi.fn(),
  mockGetOrgAuthFull: vi.fn(),
  mockAssertOwnership: vi.fn(),
  mockRevalidate: vi.fn(),
  mockAudit: vi.fn(),
  mockAfter: vi.fn(),
  mockDispatchArticle: vi.fn(),
  mockAdminFrom: vi.fn(),
  mockDel: vi.fn(),
  mockPut: vi.fn(),
}))

vi.mock('@/lib/supabase/actions', () => ({
  requireOrgAuth: mockRequireOrgAuth,
  requireOrgAuthFull: mockRequireOrgAuthFull,
  getOrgAuth: mockGetOrgAuth,
  getOrgAuthFull: mockGetOrgAuthFull,
  assertEventOwnership: mockAssertOwnership,
}))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidate }))
vi.mock('next/server', () => ({ after: mockAfter }))
vi.mock('@/lib/audit', () => ({ audit: mockAudit }))
vi.mock('@vercel/blob', () => ({ del: mockDel, put: mockPut }))
vi.mock('@/lib/notifications/dispatchArticleNotification', () => ({
  dispatchArticleNotification: mockDispatchArticle,
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}))

const EVENT = '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b'
const MEMBER = { id: 'tm-1', full_name: 'Ana', organization_id: 'org-1', role: 'admin' }

function chain(result: unknown, calls?: { inserts?: unknown[]; updates?: unknown[]; upserts?: unknown[] }) {
  const c: Record<string, unknown> = {}
  const self = () => c
  for (const m of ['select', 'eq', 'is', 'order', 'limit', 'returns', 'maybeSingle', 'single', 'delete', 'in']) {
    c[m] = vi.fn(self)
  }
  c.insert = vi.fn((payload: unknown) => {
    calls?.inserts?.push(payload)
    return c
  })
  c.update = vi.fn((payload: unknown) => {
    calls?.updates?.push(payload)
    return c
  })
  c.upsert = vi.fn((payload: unknown) => {
    calls?.upserts?.push(payload)
    return c
  })
  ;(c as { then?: unknown }).then = (resolve: (v: unknown) => void) => resolve(result)
  return c
}

// createClient (server) partilhado: usado por reports e cliping
const { mockGetUser, mockServerFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockServerFrom: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser }, from: mockServerFrom })),
}))

function makeSeqSupabase() {
  const from = vi.fn()
  return { supabase: { from }, from }
}

function authAll(supabase: unknown) {
  const auth = { supabase, user: { id: 'user-1' }, member: MEMBER }
  mockRequireOrgAuth.mockResolvedValue(auth)
  mockRequireOrgAuthFull.mockResolvedValue(auth)
  mockGetOrgAuth.mockResolvedValue(auth)
  mockGetOrgAuthFull.mockResolvedValue(auth)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAssertOwnership.mockResolvedValue(true)
})

describe('clients actions', () => {
  it('rejects event from another org', async () => {
    const { supabase } = makeSeqSupabase()
    authAll(supabase)
    mockAssertOwnership.mockResolvedValue(false)
    const { addExistingClientAction } = await import(
      '@/app/dashboard/events/[eventId]/clients/actions'
    )
    await expect(addExistingClientAction(EVENT, 'client-1', 'vip')).rejects.toThrow(
      'Evento não encontrado'
    )
  })

  it('rejects client from another org', async () => {
    const { supabase, from } = makeSeqSupabase()
    authAll(supabase)
    from.mockReturnValueOnce(chain({ data: null })) // lookup client
    const { addExistingClientAction } = await import(
      '@/app/dashboard/events/[eventId]/clients/actions'
    )
    await expect(addExistingClientAction(EVENT, 'client-1', 'vip')).rejects.toThrow(
      'Cliente não encontrado'
    )
  })

  it('adds existing client with default notification prefs', async () => {
    const inserts: unknown[] = []
    const { supabase, from } = makeSeqSupabase()
    authAll(supabase)
    from
      .mockReturnValueOnce(chain({ data: { id: 'client-1' } }))
      .mockReturnValueOnce(chain({ error: null }, { inserts }))
    const { addExistingClientAction } = await import(
      '@/app/dashboard/events/[eventId]/clients/actions'
    )
    await addExistingClientAction(EVENT, 'client-1', 'vip')
    const inserted = inserts[0] as Record<string, unknown>
    expect(inserted.role).toBe('vip')
    expect(inserted.notification_prefs).toMatchObject({ language: 'pt' })
  })

  it('removes client from event', async () => {
    const { supabase, from } = makeSeqSupabase()
    authAll(supabase)
    from.mockReturnValueOnce(chain({ error: null }))
    const { removeClientAction } = await import(
      '@/app/dashboard/events/[eventId]/clients/actions'
    )
    await expect(removeClientAction(EVENT, 'ec-1')).resolves.toBeUndefined()
  })
})

describe('team actions', () => {
  it('rejects member from another org', async () => {
    const { supabase, from } = makeSeqSupabase()
    authAll(supabase)
    from.mockReturnValueOnce(chain({ data: null }))
    const { assignTeamMemberAction } = await import(
      '@/app/dashboard/events/[eventId]/team/actions'
    )
    await expect(assignTeamMemberAction(EVENT, 'tm-2')).rejects.toThrow(
      'Membro não pertence à organização'
    )
  })

  it('maps duplicate assignment to friendly error', async () => {
    const { supabase, from } = makeSeqSupabase()
    authAll(supabase)
    from
      .mockReturnValueOnce(chain({ data: { id: 'tm-2' } }))
      .mockReturnValueOnce(chain({ error: { code: '23505' } }))
    const { assignTeamMemberAction } = await import(
      '@/app/dashboard/events/[eventId]/team/actions'
    )
    await expect(assignTeamMemberAction(EVENT, 'tm-2')).rejects.toThrow('já está atribuído')
  })

  it('assigns member and audits', async () => {
    const { supabase, from } = makeSeqSupabase()
    authAll(supabase)
    from
      .mockReturnValueOnce(chain({ data: { id: 'tm-2' } }))
      .mockReturnValueOnce(chain({ error: null }))
    const { assignTeamMemberAction } = await import(
      '@/app/dashboard/events/[eventId]/team/actions'
    )
    await assignTeamMemberAction(EVENT, 'tm-2', 'Produção')
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'member.invited' }))
  })
})

describe('reports actions', () => {
  const form = () => {
    const fd = new FormData()
    fd.set('title', 'Relatório técnico')
    fd.set('type', 'technical')
    fd.set('file_name', 'rel.pdf')
    fd.set('blob_url', 'https://blob.vercel-storage.com/rel.pdf')
    fd.set('blob_pathname', 'rel.pdf')
    return fd
  }

  it('rejects unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { createReportAction } = await import(
      '@/app/dashboard/events/[eventId]/reports/actions'
    )
    const result = await createReportAction(EVENT, form())
    expect(result).toEqual({ ok: false, error: 'Nao autenticado' })
  })

  it('creates report', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockServerFrom
      .mockReturnValueOnce(chain({ data: { id: 'tm-1' } })) // member
      .mockReturnValueOnce(chain({ data: { organization_id: 'org-1' } })) // event
      .mockReturnValueOnce(chain({ data: { id: 'rep-1' }, error: null })) // insert
    const { createReportAction } = await import(
      '@/app/dashboard/events/[eventId]/reports/actions'
    )
    const result = await createReportAction(EVENT, form())
    expect(result).toEqual({ ok: true, reportId: 'rep-1' })
  })

  it('cleans up blob when insert fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockServerFrom
      .mockReturnValueOnce(chain({ data: { id: 'tm-1' } }))
      .mockReturnValueOnce(chain({ data: { organization_id: 'org-1' } }))
      .mockReturnValueOnce(chain({ data: null, error: { message: 'boom' } }))
    const { createReportAction } = await import(
      '@/app/dashboard/events/[eventId]/reports/actions'
    )
    const result = await createReportAction(EVENT, form())
    expect(result.ok).toBe(false)
    expect(mockDel).toHaveBeenCalledWith('https://blob.vercel-storage.com/rel.pdf')
  })
})

describe('cliping actions', () => {
  const form = () => {
    const fd = new FormData()
    fd.set('title', 'Artigo no jornal')
    fd.set('url', 'https://jornal.pt/artigo')
    fd.set('source', 'Jornal')
    return fd
  }

  it('rejects invalid url', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { createArticleAction } = await import(
      '@/app/dashboard/events/[eventId]/cliping/actions'
    )
    const fd = form()
    fd.set('url', 'ftp://x')
    const result = await createArticleAction(EVENT, fd)
    expect(result.ok).toBe(false)
  })

  it('creates article, counts clients and schedules notification', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockServerFrom
      .mockReturnValueOnce(chain({ data: { id: 'tm-1' } })) // member
      .mockReturnValueOnce(chain({ data: { id: EVENT, organization_id: 'org-1' } })) // event
      .mockReturnValueOnce(chain({ data: { id: 'art-1' }, error: null })) // insert
    mockAdminFrom.mockReturnValueOnce(chain({ count: 3 }))
    const { createArticleAction } = await import(
      '@/app/dashboard/events/[eventId]/cliping/actions'
    )
    const result = await createArticleAction(EVENT, form())
    expect(result).toEqual({ ok: true, articleId: 'art-1', notifiedClients: 3 })
    expect(mockAfter).toHaveBeenCalledOnce()
  })
})

describe('sorteios actions', () => {
  it('creates raffle org-scoped', async () => {
    const inserts: unknown[] = []
    const { supabase, from } = makeSeqSupabase()
    authAll(supabase)
    from.mockReturnValueOnce(chain({ data: { id: 'raf-1' }, error: null }, { inserts }))
    const { createRaffleAction } = await import(
      '@/app/dashboard/events/[eventId]/sorteios/actions'
    )
    const raffle = await createRaffleAction(EVENT, { title: ' Sorteio VIP ' })
    expect(raffle).toEqual({ id: 'raf-1' })
    expect((inserts[0] as Record<string, unknown>).title).toBe('Sorteio VIP')
    expect((inserts[0] as Record<string, unknown>).organization_id).toBe('org-1')
  })

  it('bulk entries filters empty names', async () => {
    const inserts: unknown[] = []
    const { supabase, from } = makeSeqSupabase()
    authAll(supabase)
    from.mockReturnValueOnce(chain({ error: null, count: 2 }, { inserts }))
    const { addEntriesBulkAction } = await import(
      '@/app/dashboard/events/[eventId]/sorteios/actions'
    )
    const count = await addEntriesBulkAction('raf-1', [' Ana ', '', 'Rui', '  '])
    expect(count).toBe(2)
    expect(inserts[0]).toHaveLength(2)
  })

  it('draws winner from entries', async () => {
    const { supabase, from } = makeSeqSupabase()
    authAll(supabase)
    from
      .mockReturnValueOnce(chain({ error: null })) // reset winners
      .mockReturnValueOnce(chain({ data: [{ id: 'e1' }], error: null })) // entries
      .mockReturnValueOnce(chain({ data: { id: 'e1', is_winner: true }, error: null })) // set winner
      .mockReturnValueOnce(chain({ error: null })) // raffle completed
    const { drawWinnerAction } = await import(
      '@/app/dashboard/events/[eventId]/sorteios/actions'
    )
    const winner = await drawWinnerAction('raf-1')
    expect(winner).toMatchObject({ id: 'e1', is_winner: true })
  })

  it('throws without participants', async () => {
    const { supabase, from } = makeSeqSupabase()
    authAll(supabase)
    from
      .mockReturnValueOnce(chain({ error: null }))
      .mockReturnValueOnce(chain({ data: [], error: null }))
    const { drawWinnerAction } = await import(
      '@/app/dashboard/events/[eventId]/sorteios/actions'
    )
    await expect(drawWinnerAction('raf-1')).rejects.toThrow('Sem participantes')
  })
})

describe('tasks actions', () => {
  it('returns null when unauthenticated', async () => {
    mockGetOrgAuth.mockResolvedValue(null)
    const { createTaskAction } = await import('@/app/dashboard/events/[eventId]/tasks/actions')
    expect(await createTaskAction(EVENT, { title: 'Task' })).toBeNull()
  })

  it('creates root task at next position', async () => {
    const inserts: unknown[] = []
    const { supabase, from } = makeSeqSupabase()
    authAll(supabase)
    from
      .mockReturnValueOnce(chain({ data: [{ position: 4 }] })) // siblings
      .mockReturnValueOnce(chain({ data: { id: 't1', title: 'Task' } }, { inserts })) // insert
    const { createTaskAction } = await import('@/app/dashboard/events/[eventId]/tasks/actions')
    const task = await createTaskAction(EVENT, { title: '  Task  ' })
    expect(task).toMatchObject({ id: 't1' })
    expect((inserts[0] as Record<string, unknown>).position).toBe(5)
    expect((inserts[0] as Record<string, unknown>).title).toBe('Task')
  })

  it('sets completed_at when status becomes completed', async () => {
    const updates: unknown[] = []
    const { supabase, from } = makeSeqSupabase()
    authAll(supabase)
    from.mockReturnValueOnce(chain({ data: { id: 't1', status: 'completed' } }, { updates }))
    const { updateTaskAction } = await import('@/app/dashboard/events/[eventId]/tasks/actions')
    await updateTaskAction(EVENT, 't1', { status: 'completed' })
    expect((updates[0] as Record<string, unknown>).completed_at).toBeTruthy()
  })

  it('deleteTaskAction true only when a row was deleted', async () => {
    const { supabase, from } = makeSeqSupabase()
    authAll(supabase)
    from
      .mockReturnValueOnce(chain({ error: null, count: 1 }))
      .mockReturnValueOnce(chain({ error: null, count: 0 }))
    const { deleteTaskAction } = await import('@/app/dashboard/events/[eventId]/tasks/actions')
    expect(await deleteTaskAction(EVENT, 't1')).toBe(true)
    expect(await deleteTaskAction(EVENT, 't2')).toBe(false)
  })
})

describe('new event actions', () => {
  it('saveChecklistDraftsAction rejects event from another org', async () => {
    const { supabase, from } = makeSeqSupabase()
    authAll(supabase)
    from.mockReturnValueOnce(chain({ data: null })) // event lookup
    const { saveChecklistDraftsAction } = await import('@/app/dashboard/events/new/actions')
    await expect(
      saveChecklistDraftsAction(EVENT, [
        { id: 'i1', title: 'Etapa', client_label: null, is_client_visible: true },
      ])
    ).rejects.toThrow('Evento não encontrado')
  })

  it('saveChecklistDraftsAction upserts rows with defaults', async () => {
    const upserts: unknown[] = []
    const { supabase, from } = makeSeqSupabase()
    authAll(supabase)
    from
      .mockReturnValueOnce(chain({ data: { id: EVENT } }))
      .mockReturnValueOnce(chain({ error: null }, { upserts }))
    const { saveChecklistDraftsAction } = await import('@/app/dashboard/events/new/actions')
    await saveChecklistDraftsAction(EVENT, [
      { id: 'i1', title: 'Etapa', client_label: null, is_client_visible: true },
    ])
    const rows = upserts[0] as Record<string, unknown>[]
    expect(rows[0].client_label).toBe('Etapa')
    expect(rows[0].position).toBe(10)
  })

  it('createEventAction inserts event, sets portal token and applies template', async () => {
    const inserts: unknown[] = []
    const updates: unknown[] = []
    const { supabase, from } = makeSeqSupabase()
    authAll(supabase)
    from
      .mockReturnValueOnce(chain({ data: { id: 'ev-1' }, error: null }, { inserts })) // insert event
      .mockReturnValueOnce(chain({ error: null }, { updates })) // portal token update
      .mockReturnValueOnce(
        chain({
          data: {
            id: 'tpl-1',
            checklist_template_items: [
              {
                id: 'ti-1',
                title: 'Etapa 1',
                client_label: 'Etapa 1',
                description: null,
                position: 10,
                is_client_visible: true,
              },
            ],
          },
        })
      ) // template
      .mockReturnValueOnce(chain({ error: null }, { inserts })) // items insert
      .mockReturnValueOnce(chain({ data: [{ id: 'ci-1' }] })) // items select
    const { createEventAction } = await import('@/app/dashboard/events/new/actions')
    const result = await createEventAction(EVENT ? ({
      name: 'Festa Anual',
      event_type_id: 'et-1',
      start_datetime: '2026-08-01T20:00',
      end_datetime: '2026-08-01T23:00',
    } as never) : (null as never))
    expect(result.eventId).toBe('ev-1')
    expect(result.items).toHaveLength(1)
    expect((inserts[0] as Record<string, unknown>).organization_id).toBe('org-1')
    expect((inserts[0] as Record<string, unknown>).slug).toContain('festa-anual')
    expect((updates[0] as Record<string, unknown>).portal_token).toMatch(/^[A-Za-z0-9_-]{16}$/)
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'event.created' }))
  })
})
