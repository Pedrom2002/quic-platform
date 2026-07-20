import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOrgAuth, mockRevalidate } = vi.hoisted(() => ({
  mockRequireOrgAuth: vi.fn(),
  mockRevalidate: vi.fn(),
}))

vi.mock('@/lib/supabase/actions', () => ({ requireOrgAuth: mockRequireOrgAuth }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidate }))

function makeSupabase() {
  const calls: Record<string, unknown[]> = { insert: [], update: [] }
  const chain = {
    insert: vi.fn((payload: unknown) => {
      calls.insert.push(payload)
      return Promise.resolve({ error: null })
    }),
    update: vi.fn((payload: unknown) => {
      calls.update.push(payload)
      return { eq: vi.fn(() => Promise.resolve({ error: null })) }
    }),
  }
  return { supabase: { from: vi.fn(() => chain) }, calls }
}

function fd(obj: Record<string, string>) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(obj)) formData.set(key, value)
  return formData
}

const EVENT_ID = '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b'

function authAs(supabase: unknown) {
  mockRequireOrgAuth.mockResolvedValue({
    supabase,
    user: { id: 'user-1' },
    member: { organization_id: 'org-1', role: 'member' },
  })
}

beforeEach(() => {
  mockRequireOrgAuth.mockReset()
  mockRevalidate.mockReset()
})

describe('createTicketType', () => {
  it('rejects unauthenticated', async () => {
    mockRequireOrgAuth.mockRejectedValue(new Error('Não autenticado'))
    const { createTicketType } = await import('@/app/dashboard/events/[eventId]/tickets/actions')
    const result = await createTicketType(EVENT_ID, fd({ name: 'Normal', price_cents: '2000', quantity_total: '100' }))
    expect(result.error).toBe('Sem permissões')
  })

  it('rejects invalid form', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { createTicketType } = await import('@/app/dashboard/events/[eventId]/tickets/actions')
    const result = await createTicketType(EVENT_ID, fd({ name: 'A', price_cents: '2000', quantity_total: '100' }))
    expect(result.error).toContain('Nome deve ter pelo menos 2 caracteres')
  })

  it('inserts with organization_id and event_id', async () => {
    const { supabase, calls } = makeSupabase()
    authAs(supabase)
    const { createTicketType } = await import('@/app/dashboard/events/[eventId]/tickets/actions')
    const result = await createTicketType(EVENT_ID, fd({ name: 'Normal', price_cents: '2000', quantity_total: '100' }))
    expect(result.error).toBeUndefined()
    const inserted = calls.insert[0] as Record<string, unknown>
    expect(inserted.organization_id).toBe('org-1')
    expect(inserted.event_id).toBe(EVENT_ID)
    expect(inserted.price_cents).toBe(2000)
    expect(mockRevalidate).toHaveBeenCalledWith(`/dashboard/events/${EVENT_ID}/tickets`)
  })
})

describe('toggleTicketTypeActive', () => {
  it('updates is_active', async () => {
    const { supabase, calls } = makeSupabase()
    authAs(supabase)
    const { toggleTicketTypeActive } = await import('@/app/dashboard/events/[eventId]/tickets/actions')
    const result = await toggleTicketTypeActive(EVENT_ID, fd({ id: EVENT_ID, is_active: 'false' }))
    expect(result.error).toBeUndefined()
    const updated = calls.update[0] as Record<string, unknown>
    expect(updated.is_active).toBe(false)
  })
})
