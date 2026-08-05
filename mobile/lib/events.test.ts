import { describe, it, expect, jest } from '@jest/globals'
import { fetchPublicEvents, fetchEventById, type PublicEvent } from './events'

describe('fetchPublicEvents', () => {
  function makeSupabase(eventsResult: { data: unknown; error: unknown }, ticketTypesResult?: { data: unknown; error: unknown }) {
    const order = jest.fn<() => Promise<{ data: unknown; error: unknown }>>().mockResolvedValue(eventsResult)
    const eventsEq = jest.fn(() => ({ order }))
    const eventsSelect = jest.fn(() => ({ eq: eventsEq }))

    const inFn = jest
      .fn<() => Promise<{ data: unknown; error: unknown }>>()
      .mockResolvedValue(ticketTypesResult ?? { data: [], error: null })
    const ticketTypesEq = jest.fn(() => ({ in: inFn }))
    const ticketTypesSelect = jest.fn(() => ({ eq: ticketTypesEq }))

    const from = jest.fn((table: string) => {
      if (table === 'events') return { select: eventsSelect }
      if (table === 'ticket_types') return { select: ticketTypesSelect }
      throw new Error(`unexpected table ${table}`)
    })
    return { from, eventsSelect, eventsEq, order, ticketTypesSelect, ticketTypesEq, inFn }
  }

  it('queries public events ordered by start date', async () => {
    const mocks = makeSupabase({
      data: [{ id: 'e1', name: 'Show X', description: null, venue_name: null, venue_address: null, start_datetime: '2026-08-01T20:00:00Z', end_datetime: '2026-08-01T23:00:00Z', cover_image_url: null }],
      error: null,
    })
    const supabase = { from: mocks.from } as never

    const result = await fetchPublicEvents(supabase)

    expect(mocks.from).toHaveBeenCalledWith('events')
    expect(mocks.eventsSelect).toHaveBeenCalledWith(
      'id, name, description, venue_name, venue_address, start_datetime, end_datetime, cover_image_url'
    )
    expect(mocks.eventsEq).toHaveBeenCalledWith('is_public_listed', true)
    expect(mocks.order).toHaveBeenCalledWith('start_datetime', { ascending: true })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Show X')
  })

  it('returns empty array on error', async () => {
    const mocks = makeSupabase({ data: null, error: { message: 'boom' } })
    const supabase = { from: mocks.from } as never

    const result = await fetchPublicEvents(supabase)
    expect(result).toEqual([])
  })

  it('attaches the cheapest active ticket price per event', async () => {
    const mocks = makeSupabase(
      {
        data: [
          { id: 'e1', name: 'Show X', description: null, venue_name: null, venue_address: null, start_datetime: '2026-08-01T20:00:00Z', end_datetime: '2026-08-01T23:00:00Z', cover_image_url: null },
          { id: 'e2', name: 'Show Y', description: null, venue_name: null, venue_address: null, start_datetime: '2026-08-02T20:00:00Z', end_datetime: '2026-08-02T23:00:00Z', cover_image_url: null },
        ],
        error: null,
      },
      {
        data: [
          { event_id: 'e1', price_cents: 2000 },
          { event_id: 'e1', price_cents: 1000 },
        ],
        error: null,
      }
    )
    const supabase = { from: mocks.from } as never

    const result = await fetchPublicEvents(supabase)

    expect(mocks.from).toHaveBeenCalledWith('ticket_types')
    expect(mocks.ticketTypesEq).toHaveBeenCalledWith('is_active', true)
    expect(mocks.inFn).toHaveBeenCalledWith('event_id', ['e1', 'e2'])
    expect(result.find(e => e.id === 'e1')?.min_ticket_price_cents).toBe(1000)
    expect(result.find(e => e.id === 'e2')?.min_ticket_price_cents).toBeNull()
  })
})

describe('fetchEventById', () => {
  it('queries a single event by id', async () => {
    const single = jest
      .fn<() => Promise<{ data: Omit<PublicEvent, 'min_ticket_price_cents'> | null; error: { message: string } | null }>>()
      .mockResolvedValue({
        data: { id: 'e1', name: 'Show X', description: null, venue_name: null, venue_address: null, start_datetime: '2026-08-01T20:00:00Z', end_datetime: '2026-08-01T23:00:00Z', cover_image_url: null },
        error: null,
      })
    const eq = jest.fn(() => ({ single }))
    const select = jest.fn(() => ({ eq }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const result = await fetchEventById(supabase, 'e1')

    expect(eq).toHaveBeenCalledWith('id', 'e1')
    expect(result?.name).toBe('Show X')
  })

  it('returns null when not found', async () => {
    const single = jest
      .fn<() => Promise<{ data: Omit<PublicEvent, 'min_ticket_price_cents'> | null; error: { message: string } | null }>>()
      .mockResolvedValue({ data: null, error: null })
    const eq = jest.fn(() => ({ single }))
    const select = jest.fn(() => ({ eq }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const result = await fetchEventById(supabase, 'missing')
    expect(result).toBeNull()
  })
})
