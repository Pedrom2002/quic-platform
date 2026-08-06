// __tests__/lib-tickets-tickets.test.ts
import { describe, it, expect, vi } from 'vitest'
import { fetchTicketTypes, fetchMyTickets, type TicketType, type MyTicket } from '@/lib/tickets/tickets'

describe('fetchTicketTypes', () => {
  it('returns active ticket types for the event, ordered by price', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        { id: 'tt1', name: 'Normal', price_cents: 1000, quantity_total: 100, quantity_sold: 10 },
        { id: 'tt2', name: 'VIP', price_cents: 5000, quantity_total: 20, quantity_sold: 2 },
      ] satisfies TicketType[],
      error: null,
    })
    const eq2 = vi.fn(() => ({ order }))
    const eq1 = vi.fn(() => ({ eq: eq2 }))
    const select = vi.fn(() => ({ eq: eq1 }))
    const supabase = { from: vi.fn(() => ({ select })) } as never

    const result = await fetchTicketTypes(supabase, 'event-1')

    expect(eq1).toHaveBeenCalledWith('event_id', 'event-1')
    expect(eq2).toHaveBeenCalledWith('is_active', true)
    expect(order).toHaveBeenCalledWith('price_cents')
    expect(result).toHaveLength(2)
    expect(result[0].price_cents).toBe(1000)
  })
})

describe('fetchMyTickets', () => {
  it('returns an empty array when there is no authenticated user', async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: null } })
    const supabase = { from: vi.fn(), auth: { getUser } } as never

    const result = await fetchMyTickets(supabase)
    expect(result).toEqual([])
  })

  it("returns the user's tickets ordered by creation date descending, when authenticated", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        { id: 't1', qr_code: 'qr-1', status: 'valid', event_id: 'event-1' },
      ] satisfies MyTicket[],
      error: null,
    })
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq }))
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const supabase = { from: vi.fn(() => ({ select })), auth: { getUser } } as never

    const result = await fetchMyTickets(supabase)

    expect(eq).toHaveBeenCalledWith('buyer_auth_user_id', 'user-1')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(result).toHaveLength(1)
  })
})
