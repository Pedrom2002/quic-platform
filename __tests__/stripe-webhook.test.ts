// __tests__/stripe-webhook.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockConstructEvent, mockFrom, mockInsert, mockRpc } = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockFrom: vi.fn(),
  mockInsert: vi.fn(),
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
  mockInsert.mockReset()
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

  it('creates tickets on checkout.session.completed and skips duplicates', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          metadata: { ticket_type_id: 'tt-1', buyer_auth_user_id: 'user-1', quantity: '2' },
        },
      },
    })

    const existingCheck = { data: [], error: null }
    const selectChain = { eq: vi.fn(() => Promise.resolve(existingCheck)) }
    const ticketTypeChain = {
      eq: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: { event_id: 'evt-1', organization_id: 'org-1' }, error: null })) })),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tickets') {
        return {
          select: vi.fn(() => selectChain),
          insert: mockInsert.mockReturnValue(Promise.resolve({ error: null })),
        }
      }
      if (table === 'ticket_types') {
        return {
          select: vi.fn(() => ticketTypeChain),
        }
      }
      throw new Error(`unexpected table ${table}`)
    })
    mockRpc.mockReturnValue(Promise.resolve({ error: null }))

    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest('{}'))

    expect(res.status).toBe(200)
    expect(mockInsert).toHaveBeenCalledOnce()
    const insertedRows = mockInsert.mock.calls[0][0] as unknown[]
    expect(insertedRows).toHaveLength(2)
    expect(mockRpc).toHaveBeenCalledWith('increment_ticket_type_sold', {
      p_ticket_type_id: 'tt-1',
      p_delta: 2,
    })
  })

  it('treats a unique-violation on insert (23505) as already processed, not an error', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_456',
          metadata: { ticket_type_id: 'tt-1', buyer_auth_user_id: 'user-1', quantity: '2' },
        },
      },
    })

    const existingCheck = { data: [], error: null }
    const selectChain = { eq: vi.fn(() => Promise.resolve(existingCheck)) }
    const ticketTypeChain = {
      eq: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: { event_id: 'evt-1', organization_id: 'org-1' }, error: null })) })),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tickets') {
        return {
          select: vi.fn(() => selectChain),
          insert: mockInsert.mockReturnValue(Promise.resolve({ error: { code: '23505', message: 'duplicate key value violates unique constraint' } })),
        }
      }
      if (table === 'ticket_types') {
        return {
          select: vi.fn(() => ticketTypeChain),
        }
      }
      throw new Error(`unexpected table ${table}`)
    })

    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const res = await POST(makeRequest('{}'))

    expect(res.status).toBe(200)
    expect(mockRpc).not.toHaveBeenCalled()
    const body = await res.json()
    expect(body.note).toBe('já processado')
  })
})
