// __tests__/stripe-webhook.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockConstructEvent, mockFrom, mockRpc } = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}))

vi.mock('stripe', () => ({
  default: class {
    webhooks = { constructEvent: mockConstructEvent }
  },
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))
vi.mock('@/lib/env', () => ({
  getEnv: () => ({ STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_x' }),
}))

function makeRequest(rawBody: string, signature = 'sig_valid') {
  return new Request('https://app.quic.pt/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': signature },
    body: rawBody,
  })
}

beforeEach(() => {
  mockConstructEvent.mockReset()
  mockFrom.mockReset()
  mockRpc.mockReset()
})

describe('POST /api/webhooks/stripe', () => {
  it('returns 400 on invalid signature', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('invalid signature')
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest('{}', 'bad_sig'))
    expect(res.status).toBe(400)
  })

  it('calls purchase_tickets atomically on checkout.session.completed', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          metadata: { ticket_type_id: 'tt-1', buyer_auth_user_id: 'user-1', quantity: '2' },
        },
      },
    })

    mockRpc.mockReturnValue(Promise.resolve({ data: { success: true }, error: null }))

    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest('{}'))

    expect(res.status).toBe(200)
    expect(mockRpc).toHaveBeenCalledWith('purchase_tickets', {
      p_ticket_type_id: 'tt-1',
      p_quantity: 2,
      p_buyer_auth_user_id: 'user-1',
      p_stripe_checkout_session_id: 'cs_test_123',
    })
  })

  it('treats an already-processed session as success without erroring', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_456',
          metadata: { ticket_type_id: 'tt-1', buyer_auth_user_id: 'user-1', quantity: '2' },
        },
      },
    })

    mockRpc.mockReturnValue(Promise.resolve({ data: { success: true, note: 'já processado' }, error: null }))

    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest('{}'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.received).toBe(true)
  })

  it('returns 409 when purchase_tickets rejects due to capacity or invalid data', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_789',
          metadata: { ticket_type_id: 'tt-1', buyer_auth_user_id: 'user-1', quantity: '5' },
        },
      },
    })

    mockRpc.mockReturnValue(Promise.resolve({ data: { success: false, error: 'Capacidade esgotada' }, error: null }))

    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest('{}'))

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Capacidade esgotada')
  })

  it('returns 500 when the RPC call itself errors', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_999',
          metadata: { ticket_type_id: 'tt-1', buyer_auth_user_id: 'user-1', quantity: '1' },
        },
      },
    })

    mockRpc.mockReturnValue(Promise.resolve({ data: null, error: { message: 'connection error' } }))

    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest('{}'))

    expect(res.status).toBe(500)
  })
})
