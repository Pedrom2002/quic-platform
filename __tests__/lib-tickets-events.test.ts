// __tests__/lib-tickets-events.test.ts
import { describe, it, expect, vi } from 'vitest'
import { fetchPublicEvents, fetchEventById, type PublicEvent } from '@/lib/tickets/events'

describe('fetchPublicEvents', () => {
  function makeSupabase(
    eventsResult: { data: unknown; error: unknown },
    ticketTypesResult?: { data: unknown; error: unknown }
  ) {
    const order = vi.fn().mockResolvedValue(eventsResult)
    const eventsSelect = vi.fn(() => ({ order }))

    const inFn = vi.fn().mockResolvedValue(ticketTypesResult ?? { data: [], error: null })
    const ticketTypesEq = vi.fn(() => ({ in: inFn }))
    const ticketTypesSelect = vi.fn(() => ({ eq: ticketTypesEq }))

    const from = vi.fn((table: string) => {
      if (table === 'public_events_listing') return { select: eventsSelect }
      if (table === 'ticket_types') return { select: ticketTypesSelect }
      throw new Error(`unexpected table ${table}`)
    })
    return { from, eventsSelect, order, ticketTypesSelect, ticketTypesEq, inFn }
  }

  it('computes the minimum ticket price from active ticket types', async () => {
    const mocks = makeSupabase(
      {
        data: [
          {
            id: 'e1',
            name: 'Show X',
            description: null,
            venue_name: null,
            venue_address: null,
            start_datetime: '2026-08-01T20:00:00Z',
            end_datetime: '2026-08-01T23:00:00Z',
            cover_image_url: null,
          },
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

    // Regression guard for C1: anon has no SELECT on `events` (0062 revoked it
    // because events.portal_token is a bearer secret): logged-out visitors on
    // /tickets must read through the public_events_listing view, which already
    // filters is_public_listed = true internally. Querying `events` directly
    // (as the mobile port originally did) silently breaks the public storefront
    // for anon users, since the resulting permission error is swallowed by
    // `if (error || !data) return []`.
    expect(mocks.from).toHaveBeenCalledWith('public_events_listing')
    expect(mocks.from).not.toHaveBeenCalledWith('events')
    expect(mocks.order).toHaveBeenCalledWith('start_datetime', { ascending: true })
    expect(mocks.from).toHaveBeenCalledWith('ticket_types')
    expect(mocks.ticketTypesEq).toHaveBeenCalledWith('is_active', true)
    expect(mocks.inFn).toHaveBeenCalledWith('event_id', ['e1'])
    expect(result).toHaveLength(1)
    expect(result[0].min_ticket_price_cents).toBe(1000)
  })

  it('returns an empty array when the events query errors', async () => {
    const mocks = makeSupabase({ data: null, error: { message: 'boom' } })
    const supabase = { from: mocks.from } as never

    const result = await fetchPublicEvents(supabase)
    expect(result).toEqual([])
  })
})

describe('fetchEventById', () => {
  it('returns the event when found', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'e1',
        name: 'Show X',
        description: null,
        venue_name: null,
        venue_address: null,
        start_datetime: '2026-08-01T20:00:00Z',
        end_datetime: '2026-08-01T23:00:00Z',
        cover_image_url: null,
      } satisfies Omit<PublicEvent, 'min_ticket_price_cents'>,
      error: null,
    })
    const eq = vi.fn(() => ({ single }))
    const select = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ select }))
    const supabase = { from } as never

    const result = await fetchEventById(supabase, 'e1')

    // Regression guard for C1: see note in fetchPublicEvents above.
    expect(from).toHaveBeenCalledWith('public_events_listing')
    expect(from).not.toHaveBeenCalledWith('events')
    expect(eq).toHaveBeenCalledWith('id', 'e1')
    expect(result?.name).toBe('Show X')
  })

  it('returns null when not found', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: null })
    const eq = vi.fn(() => ({ single }))
    const select = vi.fn(() => ({ eq }))
    const supabase = { from: vi.fn(() => ({ select })) } as never

    const result = await fetchEventById(supabase, 'missing')
    expect(result).toBeNull()
  })
})
