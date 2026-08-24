import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { fetchTicketTypes, fetchMyTickets, createCheckoutSession, type TicketType } from './tickets'

describe('fetchTicketTypes', () => {
  it('queries active ticket types for an event', async () => {
    const order = jest
      .fn<() => Promise<{ data: TicketType[] | null; error: { message: string } | null }>>()
      .mockResolvedValue({
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
    const order = jest
      .fn<() => Promise<{ data: TicketType[] | null; error: { message: string } | null }>>()
      .mockResolvedValue({ data: null, error: { message: 'boom' } })
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
    const order = jest
      .fn<() => Promise<{ data: unknown[] | null; error: { message: string } | null }>>()
      .mockResolvedValue({
        data: [{
          id: 't1',
          qr_code: 'qr-1',
          status: 'valid',
          event_id: 'event-1',
          events: { name: 'Show X', start_datetime: '2026-08-01T20:00:00.000Z' },
        }],
        error: null,
      })
    const eq = jest.fn(() => ({ order }))
    const select = jest.fn(() => ({ eq }))
    const getUser = jest
      .fn<() => Promise<{ data: { user: { id: string } | null } }>>()
      .mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const supabase = { from: jest.fn(() => ({ select })), auth: { getUser } } as never

    const result = await fetchMyTickets(supabase)

    expect(eq).toHaveBeenCalledWith('buyer_auth_user_id', 'user-1')
    expect(result).toHaveLength(1)
    expect(result[0].event_name).toBe('Show X')
    expect(result[0].event_start_datetime).toBe('2026-08-01T20:00:00.000Z')
  })

  it('returns empty array when there is no session', async () => {
    const getUser = jest
      .fn<() => Promise<{ data: { user: { id: string } | null } }>>()
      .mockResolvedValue({ data: { user: null } })
    const supabase = { from: jest.fn<() => never>(), auth: { getUser } } as never

    const result = await fetchMyTickets(supabase)
    expect(result).toEqual([])
  })
})

describe('createCheckoutSession', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns the checkout url on a successful response', async () => {
    const fetchMock = jest
      .fn<() => Promise<{ ok: boolean; json: () => Promise<{ url: string }> }>>()
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: 'https://checkout.example.com/session-123' }),
      })
    global.fetch = fetchMock as never

    const result = await createCheckoutSession('https://app.example.com', 'tt1', 2, 'token-abc')

    expect(fetchMock).toHaveBeenCalledWith('https://app.example.com/api/tickets/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-abc' },
      body: JSON.stringify({ ticketTypeId: 'tt1', quantity: 2 }),
    })
    expect(result).toBe('https://checkout.example.com/session-123')
  })

  it('returns null when the response is not ok', async () => {
    const fetchMock = jest
      .fn<() => Promise<{ ok: boolean; json: () => Promise<Record<string, never>> }>>()
      .mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      })
    global.fetch = fetchMock as never

    const result = await createCheckoutSession('https://app.example.com', 'tt1', 2, 'token-abc')
    expect(result).toBeNull()
  })

  it('returns null when fetch throws', async () => {
    const fetchMock = jest.fn<() => Promise<never>>().mockRejectedValue(new Error('network error'))
    global.fetch = fetchMock as never

    const result = await createCheckoutSession('https://app.example.com', 'tt1', 2, 'token-abc')
    expect(result).toBeNull()
  })
})
