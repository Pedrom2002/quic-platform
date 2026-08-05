// __tests__/checklist-notes-actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetOrgAuth, mockAssertOwnership, mockAssertItemBelongsToEvent } = vi.hoisted(() => ({
  mockGetOrgAuth: vi.fn(),
  mockAssertOwnership: vi.fn(),
  mockAssertItemBelongsToEvent: vi.fn(),
}))

vi.mock('@/lib/supabase/actions', () => ({
  getOrgAuth: mockGetOrgAuth,
  assertEventOwnership: mockAssertOwnership,
  assertChecklistItemBelongsToEvent: mockAssertItemBelongsToEvent,
}))

const EVENT = '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b'
const MEMBER = { organization_id: 'org-1', role: 'member' }

function chain(result: unknown, calls?: { inserts?: unknown[] }) {
  const c: Record<string, unknown> = {}
  const self = () => c
  for (const m of ['select', 'eq', 'order', 'returns', 'single']) {
    c[m] = vi.fn(self)
  }
  c.insert = vi.fn((payload: unknown) => {
    calls?.inserts?.push(payload)
    return c
  })
  c.delete = vi.fn(() => c)
  ;(c as { then?: unknown }).then = (resolve: (v: unknown) => void) => resolve(result)
  return c
}

function makeSupabase() {
  const from = vi.fn()
  return { supabase: { from }, from }
}

function authAs(supabase: unknown) {
  const auth = { supabase, user: { id: 'user-1' }, member: MEMBER }
  mockGetOrgAuth.mockResolvedValue(auth)
  return auth
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAssertOwnership.mockResolvedValue(true)
  mockAssertItemBelongsToEvent.mockResolvedValue(true)
})

describe('addItemNoteAction', () => {
  it('returns null when unauthenticated', async () => {
    mockGetOrgAuth.mockResolvedValue(null)
    const { addItemNoteAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-notes'
    )
    expect(await addItemNoteAction(EVENT, 'item-1', 'hello')).toBeNull()
  })

  it('returns null when event is not owned by the org', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    mockAssertOwnership.mockResolvedValue(false)
    const { addItemNoteAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-notes'
    )
    expect(await addItemNoteAction(EVENT, 'item-1', 'hello')).toBeNull()
  })

  it('returns null for empty (whitespace-only) content', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { addItemNoteAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-notes'
    )
    expect(await addItemNoteAction(EVENT, 'item-1', '   ')).toBeNull()
  })

  it('returns null when content exceeds 10000 chars', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { addItemNoteAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-notes'
    )
    const tooLong = 'a'.repeat(10001)
    expect(await addItemNoteAction(EVENT, 'item-1', tooLong)).toBeNull()
  })

  it('inserts note scoped to org and event, trims content, resolves author', async () => {
    const inserts: unknown[] = []
    const note = { id: 'n1', content: 'hello' }
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    from
      .mockReturnValueOnce(chain({ data: { id: 'tm-1' } })) // author lookup
      .mockReturnValueOnce(chain({ data: note }, { inserts })) // insert
    const { addItemNoteAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-notes'
    )
    const result = await addItemNoteAction(EVENT, 'item-1', '  hello  ')
    expect(result).toEqual(note)
    const inserted = inserts[0] as Record<string, unknown>
    expect(inserted.organization_id).toBe('org-1')
    expect(inserted.event_id).toBe(EVENT)
    expect(inserted.checklist_item_id).toBe('item-1')
    expect(inserted.content).toBe('hello')
    expect(inserted.author_id).toBe('tm-1')
  })

  it('falls back to null author_id when author lookup misses', async () => {
    const inserts: unknown[] = []
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    from
      .mockReturnValueOnce(chain({ data: null })) // author lookup miss
      .mockReturnValueOnce(chain({ data: { id: 'n1' } }, { inserts }))
    const { addItemNoteAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-notes'
    )
    await addItemNoteAction(EVENT, 'item-1', 'hello')
    expect((inserts[0] as Record<string, unknown>).author_id).toBeNull()
  })

  it('returns null when insert returns no data', async () => {
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    from
      .mockReturnValueOnce(chain({ data: { id: 'tm-1' } }))
      .mockReturnValueOnce(chain({ data: null }))
    const { addItemNoteAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-notes'
    )
    expect(await addItemNoteAction(EVENT, 'item-1', 'hello')).toBeNull()
  })
})

describe('deleteItemNoteAction', () => {
  it('returns false when unauthenticated', async () => {
    mockGetOrgAuth.mockResolvedValue(null)
    const { deleteItemNoteAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-notes'
    )
    expect(await deleteItemNoteAction(EVENT, 'item-1', 'n1')).toBe(false)
  })

  it('returns false when event is not owned by the org', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    mockAssertOwnership.mockResolvedValue(false)
    const { deleteItemNoteAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-notes'
    )
    expect(await deleteItemNoteAction(EVENT, 'item-1', 'n1')).toBe(false)
  })

  it('deletes note scoped to org/event/item and returns true on success', async () => {
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    const deleteChain = chain({ error: null, count: 1 })
    from.mockReturnValueOnce(deleteChain)
    const { deleteItemNoteAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-notes'
    )
    expect(await deleteItemNoteAction(EVENT, 'item-1', 'n1')).toBe(true)
    expect(deleteChain.delete).toHaveBeenCalledWith({ count: 'exact' })
    expect(deleteChain.eq).toHaveBeenCalledWith('id', 'n1')
    expect(deleteChain.eq).toHaveBeenCalledWith('checklist_item_id', 'item-1')
    expect(deleteChain.eq).toHaveBeenCalledWith('event_id', EVENT)
    expect(deleteChain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
  })

  it('returns false when nothing was deleted (count 0)', async () => {
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    from.mockReturnValueOnce(chain({ error: null, count: 0 }))
    const { deleteItemNoteAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-notes'
    )
    expect(await deleteItemNoteAction(EVENT, 'item-1', 'n1')).toBe(false)
  })

  it('returns false when delete errors', async () => {
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    from.mockReturnValueOnce(chain({ error: { message: 'db error' }, count: 0 }))
    const { deleteItemNoteAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-notes'
    )
    expect(await deleteItemNoteAction(EVENT, 'item-1', 'n1')).toBe(false)
  })
})

describe('loadItemNotesAction', () => {
  it('returns [] when unauthenticated', async () => {
    mockGetOrgAuth.mockResolvedValue(null)
    const { loadItemNotesAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-notes'
    )
    expect(await loadItemNotesAction(EVENT, 'item-1')).toEqual([])
  })

  it('loads notes scoped to org/event/item ordered by newest first', async () => {
    const notes = [{ id: 'n1' }, { id: 'n2' }]
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    const selectChain = chain({ data: notes })
    from.mockReturnValueOnce(selectChain)
    const { loadItemNotesAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-notes'
    )
    const result = await loadItemNotesAction(EVENT, 'item-1')
    expect(result).toEqual(notes)
    expect(selectChain.eq).toHaveBeenCalledWith('checklist_item_id', 'item-1')
    expect(selectChain.eq).toHaveBeenCalledWith('event_id', EVENT)
    expect(selectChain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
    expect(selectChain.order).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('returns [] when data is null', async () => {
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    from.mockReturnValueOnce(chain({ data: null }))
    const { loadItemNotesAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-notes'
    )
    expect(await loadItemNotesAction(EVENT, 'item-1')).toEqual([])
  })
})
