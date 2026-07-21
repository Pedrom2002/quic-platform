import { describe, it, expect, jest } from '@jest/globals'
import { fetchTicketTypes, fetchMyTickets } from './tickets'

describe('fetchTicketTypes', () => {
  it('queries active ticket types for an event', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: 'tt1', name: 'Normal', price_cents: 2000, quantity_total: 100, quantity_sold: 10 }],
      error: null,
    })
    const eq2 = jest.fn(() => ({ order }))
    const eq1 = jest.fn(() => ({ eq: eq2 }))
    const select = jest.fn(() => ({ eq: eq1 }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const result = await fetchTicketTypes(supabase, 'event-1')

    expect(eq1).toHaveBeenCalledWith('event_id', 'event-1')
    expect(eq2).toHaveBeenCalledWith('is_active', true)
    expect(result).toHaveLength(1)
  })

  it('returns empty array on error', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const eq2 = jest.fn(() => ({ order }))
    const eq1 = jest.fn(() => ({ eq: eq2 }))
    const select = jest.fn(() => ({ eq: eq1 }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const result = await fetchTicketTypes(supabase, 'event-1')
    expect(result).toEqual([])
  })
})

describe('fetchMyTickets', () => {
  it('queries tickets for the current buyer', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: 't1', qr_code: 'qr-1', status: 'valid', event_id: 'event-1' }],
      error: null,
    })
    const eq = jest.fn(() => ({ order }))
    const select = jest.fn(() => ({ eq }))
    const getUser = jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const supabase = { from: jest.fn(() => ({ select })), auth: { getUser } } as never

    const result = await fetchMyTickets(supabase)

    expect(eq).toHaveBeenCalledWith('buyer_auth_user_id', 'user-1')
    expect(result).toHaveLength(1)
  })

  it('returns empty array when there is no session', async () => {
    const getUser = jest.fn().mockResolvedValue({ data: { user: null } })
    const supabase = { from: jest.fn(), auth: { getUser } } as never

    const result = await fetchMyTickets(supabase)
    expect(result).toEqual([])
  })
})
