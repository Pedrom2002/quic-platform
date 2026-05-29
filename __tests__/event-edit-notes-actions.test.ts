/**
 * Tests for event Server Actions:
 *   - app/dashboard/events/[eventId]/edit/actions.ts  (delete/update/portal videos)
 *   - app/dashboard/events/[eventId]/notes/actions.ts (add/delete note)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOrgAuth, mockGetOrgAuth, mockGetOrgAuthFull, mockAudit } = vi.hoisted(() => ({
  mockRequireOrgAuth: vi.fn(),
  mockGetOrgAuth: vi.fn(),
  mockGetOrgAuthFull: vi.fn(),
  mockAudit: vi.fn(),
}))

vi.mock('@/lib/supabase/actions', () => ({
  requireOrgAuth: mockRequireOrgAuth,
  getOrgAuth: mockGetOrgAuth,
  getOrgAuthFull: mockGetOrgAuthFull,
}))
vi.mock('@/lib/audit', () => ({ audit: mockAudit }))

// Generic Supabase query chain: every builder method returns `this`;
// `.single()`/`.maybeSingle()` resolve `single`; awaiting the chain resolves `resolved`.
function chain(single: unknown, resolved: unknown = { error: null }) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'is', 'lte', 'order', 'returns']) {
    c[m] = vi.fn(() => c)
  }
  c.single = vi.fn().mockResolvedValue(single)
  c.maybeSingle = vi.fn().mockResolvedValue(single)
  c.then = (res: (v: unknown) => void) => Promise.resolve(resolved).then(res)
  return c
}

const USER = { id: 'user-1' }
const MEMBER = { id: 'tm-1', full_name: 'Ana', organization_id: 'org-1', role: 'member' }
const ADMIN = { ...MEMBER, role: 'admin' }

beforeEach(() => vi.clearAllMocks())

// ─── edit/actions.ts ───────────────────────────────────────────────────────────

describe('deleteEventAction', () => {
  it('blocks non-admin members', async () => {
    mockRequireOrgAuth.mockResolvedValue({ supabase: { from: vi.fn() }, user: USER, member: MEMBER })
    const { deleteEventAction } = await import('@/app/dashboard/events/[eventId]/edit/actions')
    await expect(deleteEventAction('e1')).rejects.toThrow('administradores')
  })

  it('deletes and audits when admin', async () => {
    const from = vi.fn(() => chain(null, { error: null }))
    mockRequireOrgAuth.mockResolvedValue({ supabase: { from }, user: USER, member: ADMIN })
    const { deleteEventAction } = await import('@/app/dashboard/events/[eventId]/edit/actions')
    await deleteEventAction('e1')
    expect(from).toHaveBeenCalledWith('events')
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'event.deleted', eventId: 'e1' }))
  })

  it('throws when delete errors', async () => {
    const from = vi.fn(() => chain(null, { error: { message: 'boom' } }))
    mockRequireOrgAuth.mockResolvedValue({ supabase: { from }, user: USER, member: ADMIN })
    const { deleteEventAction } = await import('@/app/dashboard/events/[eventId]/edit/actions')
    await expect(deleteEventAction('e1')).rejects.toThrow('boom')
  })
})

describe('updateEventAction', () => {
  it('throws when event not found', async () => {
    const from = vi.fn(() => chain({ data: null }))
    mockRequireOrgAuth.mockResolvedValue({ supabase: { from }, user: USER, member: MEMBER })
    const { updateEventAction } = await import('@/app/dashboard/events/[eventId]/edit/actions')
    await expect(updateEventAction('e1', { name: 'X' })).rejects.toThrow('não encontrado')
  })

  it('updates and audits on status change', async () => {
    const from = vi.fn(() => chain({ data: { id: 'e1' } }, { error: null }))
    mockRequireOrgAuth.mockResolvedValue({ supabase: { from }, user: USER, member: MEMBER })
    const { updateEventAction } = await import('@/app/dashboard/events/[eventId]/edit/actions')
    await updateEventAction('e1', { status: 'active', start_datetime: '2026-01-01T10:00:00Z' })
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'event.status.changed' }))
  })

  it('throws when update errors', async () => {
    const from = vi.fn(() => chain({ data: { id: 'e1' } }, { error: { message: 'db' } }))
    mockRequireOrgAuth.mockResolvedValue({ supabase: { from }, user: USER, member: MEMBER })
    const { updateEventAction } = await import('@/app/dashboard/events/[eventId]/edit/actions')
    await expect(updateEventAction('e1', { name: 'X' })).rejects.toThrow('db')
  })
})

describe('updatePortalVideosAction', () => {
  it('throws when event not found', async () => {
    const from = vi.fn(() => chain({ data: null }))
    mockRequireOrgAuth.mockResolvedValue({ supabase: { from }, user: USER, member: MEMBER })
    const { updatePortalVideosAction } = await import('@/app/dashboard/events/[eventId]/edit/actions')
    await expect(updatePortalVideosAction('e1', 'h', 'c')).rejects.toThrow('não encontrado')
  })

  it('merges settings and updates', async () => {
    const from = vi.fn(() => chain({ data: { id: 'e1', settings: { foo: 'bar' } } }, { error: null }))
    mockRequireOrgAuth.mockResolvedValue({ supabase: { from }, user: USER, member: MEMBER })
    const { updatePortalVideosAction } = await import('@/app/dashboard/events/[eventId]/edit/actions')
    await expect(updatePortalVideosAction('e1', 'hero.mp4', '')).resolves.toBeUndefined()
  })
})

// ─── notes/actions.ts ────────────────────────────────────────────────────────────

describe('addNoteAction', () => {
  it('returns null when unauthenticated', async () => {
    mockGetOrgAuthFull.mockResolvedValue(null)
    const { addNoteAction } = await import('@/app/dashboard/events/[eventId]/notes/actions')
    expect(await addNoteAction('e1', 'hello')).toBeNull()
  })

  it('returns null when event not found', async () => {
    const from = vi.fn(() => chain({ data: null }))
    mockGetOrgAuthFull.mockResolvedValue({ supabase: { from }, user: USER, member: MEMBER })
    const { addNoteAction } = await import('@/app/dashboard/events/[eventId]/notes/actions')
    expect(await addNoteAction('e1', 'hello')).toBeNull()
  })

  it('returns null when content fails validation', async () => {
    const from = vi.fn(() => chain({ data: { id: 'e1' } }))
    mockGetOrgAuthFull.mockResolvedValue({ supabase: { from }, user: USER, member: MEMBER })
    const { addNoteAction } = await import('@/app/dashboard/events/[eventId]/notes/actions')
    expect(await addNoteAction('e1', '')).toBeNull()
  })

  it('inserts and returns the note', async () => {
    const note = { id: 'n1', content: 'hello' }
    const from = vi.fn((table: string) =>
      table === 'events' ? chain({ data: { id: 'e1' } }) : chain({ data: note }))
    mockGetOrgAuthFull.mockResolvedValue({ supabase: { from }, user: USER, member: MEMBER })
    const { addNoteAction } = await import('@/app/dashboard/events/[eventId]/notes/actions')
    expect(await addNoteAction('e1', 'hello')).toEqual(note)
  })
})

describe('deleteNoteAction', () => {
  it('returns false when unauthenticated', async () => {
    mockGetOrgAuth.mockResolvedValue(null)
    const { deleteNoteAction } = await import('@/app/dashboard/events/[eventId]/notes/actions')
    expect(await deleteNoteAction('e1', 'n1')).toBe(false)
  })

  it('returns true when a row was deleted', async () => {
    const from = vi.fn(() => chain(null, { error: null, count: 1 }))
    mockGetOrgAuth.mockResolvedValue({ supabase: { from }, user: USER, member: MEMBER })
    const { deleteNoteAction } = await import('@/app/dashboard/events/[eventId]/notes/actions')
    expect(await deleteNoteAction('e1', 'n1')).toBe(true)
  })

  it('returns false when nothing was deleted', async () => {
    const from = vi.fn(() => chain(null, { error: null, count: 0 }))
    mockGetOrgAuth.mockResolvedValue({ supabase: { from }, user: USER, member: MEMBER })
    const { deleteNoteAction } = await import('@/app/dashboard/events/[eventId]/notes/actions')
    expect(await deleteNoteAction('e1', 'n1')).toBe(false)
  })
})
