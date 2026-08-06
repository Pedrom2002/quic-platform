// __tests__/tickets-checkout-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockCreateSession, mockGetUser, mockFrom, mockAdminGetUser, mockAdminFrom } = vi.hoisted(() => ({
  mockCreateSession: vi.fn(),
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockAdminGetUser: vi.fn(),
  mockAdminFrom: vi.fn(),
}))

vi.mock('stripe', () => ({
  default: class {
    checkout = { sessions: { create: mockCreateSession } }
  },
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { getUser: mockAdminGetUser },
    from: mockAdminFrom,
  }),
}))
vi.mock('@/lib/env', () => ({
  getEnv: () => ({ STRIPE_SECRET_KEY: 'sk_test_x', NEXT_PUBLIC_APP_URL: 'https://app.quic.pt' }),
}))

function makeRequest(body: unknown, headers?: Record<string, string>) {
  return new Request('https://app.quic.pt/api/tickets/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  })
}

const TICKET_TYPE_ID = '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b'

beforeEach(() => {
  mockCreateSession.mockReset()
  mockGetUser.mockReset()
  mockFrom.mockReset()
  mockAdminGetUser.mockReset()
  mockAdminFrom.mockReset()
})

describe('POST /api/tickets/checkout', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { POST } = await import('@/app/api/tickets/checkout/route')
    const res = await POST(makeRequest({ ticketTypeId: TICKET_TYPE_ID, quantity: 1 }))
    expect(res.status).toBe(401)
  })

  it('returns 404 when ticket type not found or inactive', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
    })
    const { POST } = await import('@/app/api/tickets/checkout/route')
    const res = await POST(makeRequest({ ticketTypeId: TICKET_TYPE_ID, quantity: 1 }))
    expect(res.status).toBe(404)
  })

  it('creates a checkout session and returns its url', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: { id: TICKET_TYPE_ID, name: 'Normal', price_cents: 2000, currency: 'eur' },
                error: null,
              }),
          }),
        }),
      }),
    })
    mockCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/session-123' })

    const { POST } = await import('@/app/api/tickets/checkout/route')
    const res = await POST(makeRequest({ ticketTypeId: TICKET_TYPE_ID, quantity: 2 }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.url).toBe('https://checkout.stripe.com/session-123')
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({ currency: 'eur', unit_amount: 2000 }),
            quantity: 2,
          }),
        ],
        metadata: expect.objectContaining({ ticket_type_id: TICKET_TYPE_ID, buyer_auth_user_id: 'user-1', quantity: '2' }),
      })
    )
  })

  it('creates a checkout session using a Bearer token (mobile)', async () => {
    mockAdminGetUser.mockResolvedValue({ data: { user: { id: 'user-mobile-1' } } })
    mockAdminFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: { id: TICKET_TYPE_ID, name: 'Normal', price_cents: 2000, currency: 'eur' },
                error: null,
              }),
          }),
        }),
      }),
    })
    mockCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/session-mobile' })

    const { POST } = await import('@/app/api/tickets/checkout/route')
    const res = await POST(
      makeRequest(
        { ticketTypeId: TICKET_TYPE_ID, quantity: 2 },
        { authorization: 'Bearer valid-mobile-token' }
      )
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.url).toBe('https://checkout.stripe.com/session-mobile')
    expect(mockAdminGetUser).toHaveBeenCalledWith('valid-mobile-token')
    // Cookie-based path must not be consulted when a Bearer token is present.
    expect(mockGetUser).not.toHaveBeenCalled()
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          ticket_type_id: TICKET_TYPE_ID,
          buyer_auth_user_id: 'user-mobile-1',
          quantity: '2',
        }),
      })
    )
  })

  it('returns 401 when Bearer token is invalid or expired', async () => {
    mockAdminGetUser.mockResolvedValue({ data: { user: null } })

    const { POST } = await import('@/app/api/tickets/checkout/route')
    const res = await POST(
      makeRequest(
        { ticketTypeId: TICKET_TYPE_ID, quantity: 1 },
        { authorization: 'Bearer expired-or-invalid-token' }
      )
    )

    expect(res.status).toBe(401)
    expect(mockAdminGetUser).toHaveBeenCalledWith('expired-or-invalid-token')
    expect(mockCreateSession).not.toHaveBeenCalled()
  })

  it('uses the quicapp:// deep link when platform is omitted (mobile backward compat)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: { id: TICKET_TYPE_ID, name: 'Normal', price_cents: 2000, currency: 'eur', event_id: 'event-1' },
                error: null,
              }),
          }),
        }),
      }),
    })
    mockCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/session-x' })

    const { POST } = await import('@/app/api/tickets/checkout/route')
    await POST(makeRequest({ ticketTypeId: TICKET_TYPE_ID, quantity: 1 }))

    const callArgs = mockCreateSession.mock.calls[0][0] as { success_url: string; cancel_url: string }
    expect(callArgs.success_url).toBe('quicapp://tickets/success?session_id={CHECKOUT_SESSION_ID}')
    expect(callArgs.cancel_url).toBe('quicapp://tickets/cancel')
  })

  it('uses the quicapp:// deep link when platform is "mobile"', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: { id: TICKET_TYPE_ID, name: 'Normal', price_cents: 2000, currency: 'eur', event_id: 'event-1' },
                error: null,
              }),
          }),
        }),
      }),
    })
    mockCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/session-x' })

    const { POST } = await import('@/app/api/tickets/checkout/route')
    await POST(makeRequest({ ticketTypeId: TICKET_TYPE_ID, quantity: 1, platform: 'mobile' }))

    const callArgs = mockCreateSession.mock.calls[0][0] as { success_url: string; cancel_url: string }
    expect(callArgs.success_url).toBe('quicapp://tickets/success?session_id={CHECKOUT_SESSION_ID}')
  })

  it('uses a same-origin web URL when platform is "web"', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: { id: TICKET_TYPE_ID, name: 'Normal', price_cents: 2000, currency: 'eur', event_id: TICKET_TYPE_ID },
                error: null,
              }),
          }),
        }),
      }),
    })
    mockCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/session-x' })

    const { POST } = await import('@/app/api/tickets/checkout/route')
    await POST(makeRequest({ ticketTypeId: TICKET_TYPE_ID, quantity: 1, platform: 'web' }))

    const callArgs = mockCreateSession.mock.calls[0][0] as { success_url: string; cancel_url: string }
    expect(callArgs.success_url).toBe('https://app.quic.pt/tickets/success?session_id={CHECKOUT_SESSION_ID}')
    expect(callArgs.cancel_url).toBe(`https://app.quic.pt/tickets/${TICKET_TYPE_ID}`)
  })
})
