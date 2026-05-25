import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({ body, status: init?.status ?? 200 })),
  },
}))

vi.mock('@/lib/notifications/dispatcher', () => ({
  dispatchNotificationsForItem: vi.fn().mockResolvedValue(undefined),
  dispatchStartNotificationForItem: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { POST } from '@/app/api/events/[eventId]/checklist-items/route'
import { PATCH, DELETE } from '@/app/api/events/[eventId]/checklist-items/[itemId]/route'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Utility to build a Supabase mock with configurable responses
function makeSupabase(config: {
  user?: unknown
  member?: unknown
  eventExists?: boolean
  itemInsertResult?: { data: unknown; error: unknown }
  itemUpdateResult?: { data: unknown; error: unknown }
  itemDeleteResult?: { error: unknown }
  currentItem?: unknown
  eventForDispatch?: unknown
}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  }

  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'team_members') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: config.member ?? null }),
      }
    }
    if (table === 'events') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: config.eventExists ? { id: 'ev-1' } : null }),
      }
    }
    if (table === 'event_checklist_items') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(config.itemUpdateResult ?? config.itemInsertResult ?? { data: { id: 'item-1' }, error: null }),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
      }
    }
    return chain
  })

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: config.user ?? { id: 'user-1' } } }) },
    from: fromMock,
  }
}

const defaultMember = { id: 'member-1', full_name: 'Test User', organization_id: 'org-1' }
const validCreateBody = { title: 'New Task', position: 1 }
const validUpdateBody = { status: 'in_progress' }

describe('POST /api/events/[eventId]/checklist-items', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when user not authenticated', async () => {
    const supabase = makeSupabase({ user: null })
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify(validCreateBody) })
    const res = await POST(req, { params: Promise.resolve({ eventId: 'ev-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 401 when user is not a team member', async () => {
    const supabase = makeSupabase({ member: null, eventExists: false })
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify(validCreateBody) })
    const res = await POST(req, { params: Promise.resolve({ eventId: 'ev-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when event not owned by org', async () => {
    const supabase = makeSupabase({ member: defaultMember, eventExists: false })
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify(validCreateBody) })
    const res = await POST(req, { params: Promise.resolve({ eventId: 'ev-99' }) })
    expect(res.status).toBe(404)
  })

  it('returns 400 when body fails schema validation', async () => {
    const supabase = makeSupabase({ member: defaultMember, eventExists: true })
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ title: '' }) })
    const res = await POST(req, { params: Promise.resolve({ eventId: 'ev-1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 201 when item created successfully', async () => {
    const supabase = makeSupabase({
      member: defaultMember,
      eventExists: true,
      itemInsertResult: { data: { id: 'new-item', title: 'New Task' }, error: null },
    })
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify(validCreateBody) })
    const res = await POST(req, { params: Promise.resolve({ eventId: 'ev-1' }) })
    expect(res.status).toBe(201)
  })

  it('returns 500 when DB insert fails', async () => {
    const supabase = makeSupabase({
      member: defaultMember,
      eventExists: true,
      itemInsertResult: { data: null, error: { message: 'constraint violation' } },
    })
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify(validCreateBody) })
    const res = await POST(req, { params: Promise.resolve({ eventId: 'ev-1' }) })
    expect(res.status).toBe(500)
  })
})

describe('PATCH /api/events/[eventId]/checklist-items/[itemId]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    const supabase = makeSupabase({ user: null })
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify(validUpdateBody) })
    const res = await PATCH(req, { params: Promise.resolve({ eventId: 'ev-1', itemId: 'item-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 401 when not a team member', async () => {
    const supabase = makeSupabase({ member: null })
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify(validUpdateBody) })
    const res = await PATCH(req, { params: Promise.resolve({ eventId: 'ev-1', itemId: 'item-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when event not owned', async () => {
    const supabase = makeSupabase({ member: defaultMember, eventExists: false })
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify(validUpdateBody) })
    const res = await PATCH(req, { params: Promise.resolve({ eventId: 'ev-99', itemId: 'item-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 400 when schema validation fails', async () => {
    const supabase = makeSupabase({ member: defaultMember, eventExists: true })
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ status: 'invalid_status' }) })
    const res = await PATCH(req, { params: Promise.resolve({ eventId: 'ev-1', itemId: 'item-1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 200 for valid in_progress status update', async () => {
    const userSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: defaultMember }) }
        }
        if (table === 'events') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'ev-1' } }) }
        }
        if (table === 'event_checklist_items') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'item-1', status: 'in_progress' }, error: null }),
            update: vi.fn().mockReturnThis(),
          }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(userSupabase as never)

    const adminSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'ev-1', name: 'Concerto' } }),
      }),
    }
    vi.mocked(createAdminClient).mockReturnValue(adminSupabase as never)

    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ status: 'in_progress' }) })
    const res = await PATCH(req, { params: Promise.resolve({ eventId: 'ev-1', itemId: 'item-1' }) })
    expect(res.status).toBe(200)
  })

  it('dispatches notifications when status set to completed', async () => {
    const { dispatchNotificationsForItem } = await import('@/lib/notifications/dispatcher')

    const adminSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'ev-1', name: 'Concerto' } }),
      }),
    }
    vi.mocked(createAdminClient).mockReturnValue(adminSupabase as never)

    // event_checklist_items is called twice in the completed flow:
    // 1. update(...).eq(...).eq(...).select().single() => returns the updated item
    // 2. select('started_at').eq('id', itemId).single() => returns current item (for started_at check)
    // We use mockResolvedValueOnce to differentiate.
    let checklistCallCount = 0
    const userSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: defaultMember }) }
        }
        if (table === 'events') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'ev-1' } }) }
        }
        if (table === 'event_checklist_items') {
          checklistCallCount++
          if (checklistCallCount === 1) {
            // First call: select('started_at').eq('id', itemId).single() — current item check
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { started_at: '2026-01-01' } }),
              update: vi.fn().mockReturnThis(),
            }
          }
          // Second call: update(...).eq(...).eq(...).select().single() — the actual update
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'item-1', status: 'completed', started_at: '2026-01-01' }, error: null }),
            update: vi.fn().mockReturnThis(),
          }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(userSupabase as never)

    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) })
    await PATCH(req, { params: Promise.resolve({ eventId: 'ev-1', itemId: 'item-1' }) })

    // Wait for the async dispatch (it's fire-and-forget with .catch())
    await new Promise(r => setTimeout(r, 10))
    expect(dispatchNotificationsForItem).toHaveBeenCalled()
  })

  it('sets started_at when completing item that has no started_at yet (line 64)', async () => {
    const { dispatchNotificationsForItem } = await import('@/lib/notifications/dispatcher')
    vi.mocked(dispatchNotificationsForItem).mockResolvedValue(undefined)

    const adminSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'ev-1', name: 'Test' } }),
      }),
    }
    vi.mocked(createAdminClient).mockReturnValue(adminSupabase as never)

    let checklistCallCount = 0
    const userSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: defaultMember }) }
        if (table === 'events') return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'ev-1' } }) }
        if (table === 'event_checklist_items') {
          checklistCallCount++
          if (checklistCallCount === 1) {
            // current item has NO started_at → triggers line 64
            return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { started_at: null } }), update: vi.fn().mockReturnThis() }
          }
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'item-1', status: 'completed', started_at: expect.any(String) }, error: null }), update: vi.fn().mockReturnThis() }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(userSupabase as never)

    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) })
    const res = await PATCH(req, { params: Promise.resolve({ eventId: 'ev-1', itemId: 'item-1' }) })
    expect(res.status).toBe(200)
  })

  it('logs error when dispatchNotificationsForItem rejects (lines 99-100)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { dispatchNotificationsForItem } = await import('@/lib/notifications/dispatcher')
    vi.mocked(dispatchNotificationsForItem).mockRejectedValue(new Error('dispatch failed'))

    const adminSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'ev-1', name: 'Test' } }),
      }),
    }
    vi.mocked(createAdminClient).mockReturnValue(adminSupabase as never)

    let checklistCallCount = 0
    const userSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: defaultMember }) }
        if (table === 'events') return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'ev-1' } }) }
        if (table === 'event_checklist_items') {
          checklistCallCount++
          if (checklistCallCount === 1) {
            return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { started_at: '2026-01-01' } }), update: vi.fn().mockReturnThis() }
          }
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'item-1', status: 'completed' }, error: null }), update: vi.fn().mockReturnThis() }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(userSupabase as never)

    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) })
    const res = await PATCH(req, { params: Promise.resolve({ eventId: 'ev-1', itemId: 'item-1' }) })
    expect(res.status).toBe(200)
    // Wait for fire-and-forget catch to execute
    await new Promise(r => setTimeout(r, 20))
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('falha ao despachar'), 'dispatch failed')
    errorSpy.mockRestore()
  })

  it('returns 500 when DB update fails', async () => {
    const userSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: defaultMember }) }
        if (table === 'events') return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'ev-1' } }) }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'update failed' } }),
          update: vi.fn().mockReturnThis(),
        }
      }),
    }
    vi.mocked(createClient).mockResolvedValue(userSupabase as never)
    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ status: 'pending' }) })
    const res = await PATCH(req, { params: Promise.resolve({ eventId: 'ev-1', itemId: 'item-1' }) })
    expect(res.status).toBe(500)
  })
})

describe('DELETE /api/events/[eventId]/checklist-items/[itemId]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    const supabase = makeSupabase({ user: null })
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const req = new Request('http://localhost', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ eventId: 'ev-1', itemId: 'item-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 401 when not a team member', async () => {
    const supabase = makeSupabase({ member: null })
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const req = new Request('http://localhost', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ eventId: 'ev-1', itemId: 'item-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when event not owned', async () => {
    const supabase = makeSupabase({ member: defaultMember, eventExists: false })
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    const req = new Request('http://localhost', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ eventId: 'ev-99', itemId: 'item-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 200 on successful deletion', async () => {
    const makeDeleteChain = (result: { error: unknown }) => {
      const chain: Record<string, unknown> = {}
      chain.eq = vi.fn(() => chain)
      // When awaited, the chain resolves to result
      chain.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve)
      const deleteChain = { delete: vi.fn(() => chain) }
      return deleteChain
    }
    const userSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: defaultMember }) }
        if (table === 'events') return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'ev-1' } }) }
        return makeDeleteChain({ error: null })
      }),
    }
    vi.mocked(createClient).mockResolvedValue(userSupabase as never)
    const req = new Request('http://localhost', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ eventId: 'ev-1', itemId: 'item-1' }) })
    expect(res.status).toBe(200)
    expect((res as unknown as { body: { success: boolean } }).body.success).toBe(true)
  })

  it('returns 500 when DB delete fails', async () => {
    const makeDeleteChain = (result: { error: unknown }) => {
      const chain: Record<string, unknown> = {}
      chain.eq = vi.fn(() => chain)
      chain.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve)
      const deleteChain = { delete: vi.fn(() => chain) }
      return deleteChain
    }
    const userSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'team_members') return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: defaultMember }) }
        if (table === 'events') return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'ev-1' } }) }
        return makeDeleteChain({ error: { message: 'delete failed' } })
      }),
    }
    vi.mocked(createClient).mockResolvedValue(userSupabase as never)
    const req = new Request('http://localhost', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ eventId: 'ev-1', itemId: 'item-1' }) })
    expect(res.status).toBe(500)
  })
})
