/**
 * Tests for POST /api/cron/marketing-followup
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockPublishJSON, mockFrom, mockNextResponseJson } = vi.hoisted(() => ({
  mockPublishJSON: vi.fn().mockResolvedValue({ messageId: 'msg-1' }),
  mockFrom: vi.fn(),
  mockNextResponseJson: vi.fn((body: unknown, init?: { status?: number }) => ({
    body,
    status: init?.status ?? 200,
  })),
}))

vi.mock('@upstash/qstash', () => ({
  Client: function Client() {
    return { publishJSON: mockPublishJSON }
  },
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}))

vi.mock('next/server', () => ({
  NextResponse: {
    json: mockNextResponseJson,
  },
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a Supabase-like thenable chain where every method returns this,
 * and the whole thing resolves with { data } when awaited.
 */
function makeChain(data: unknown[]) {
  const chain: Record<string, unknown> = {}
  const returnSelf = vi.fn(() => chain)
  chain.select = returnSelf
  chain.eq = returnSelf
  chain.in = returnSelf
  chain.lt = returnSelf
  chain.update = vi.fn(() => chain)
  chain.then = (
    onFulfilled: (v: { data: unknown[] }) => void,
    _onRejected?: (e: unknown) => void
  ) => Promise.resolve({ data }).then(onFulfilled)
  chain.catch = (_onRejected: (e: unknown) => void) => Promise.resolve({ data }).catch(_onRejected)
  return chain
}

function makeUpdateChain() {
  return {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  }
}

function makeRequest(authHeader?: string) {
  return new Request('http://localhost/api/cron/marketing-followup', {
    method: 'POST',
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/cron/marketing-followup', () => {
  const CRON_SECRET = 'test-cron-secret-minimum-32-chars-pad!'

  beforeEach(() => {
    process.env.CRON_SECRET = CRON_SECRET
    process.env.QSTASH_TOKEN = 'qstash-token'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
    mockFrom.mockReset()
    mockPublishJSON.mockReset()
    mockPublishJSON.mockResolvedValue({ messageId: 'msg-1' })
    mockNextResponseJson.mockImplementation((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }))
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
    delete process.env.QSTASH_TOKEN
  })

  it('returns 401 when authorization header is wrong', async () => {
    const { POST } = await import('@/app/api/cron/marketing-followup/route')
    const res = await POST(makeRequest('Bearer wrong'))
    expect((res as { status: number }).status).toBe(401)
  })

  it('returns 401 when authorization header is missing', async () => {
    const { POST } = await import('@/app/api/cron/marketing-followup/route')
    const res = await POST(makeRequest())
    expect((res as { status: number }).status).toBe(401)
  })

  it('returns {dispatched:0} when no active campaigns', async () => {
    mockFrom.mockReturnValue(makeChain([]))

    const { POST } = await import('@/app/api/cron/marketing-followup/route')
    const res = await POST(makeRequest(`Bearer ${CRON_SECRET}`))
    expect((res as { status: number }).status).toBe(200)
    expect((res as unknown as { body: { dispatched: number } }).body.dispatched).toBe(0)
  })

  it('skips dispatch when no QSTASH_TOKEN (qstash is null)', async () => {
    delete process.env.QSTASH_TOKEN

    const campaign = {
      id: 'camp-1',
      created_by: 'user-1',
      followup_days: 3,
      followup_subject: 'Follow up',
      followup_body: 'Hi {{nome}}',
      followup_max: 2,
    }
    const eligibleSend = { id: 's1', contact_id: 'c1', followup_count: 0 }

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain([campaign]) // campaigns
      return makeChain([eligibleSend])                  // eligible sends
    })

    const { POST } = await import('@/app/api/cron/marketing-followup/route')
    const res = await POST(makeRequest(`Bearer ${CRON_SECRET}`))
    expect(mockPublishJSON).not.toHaveBeenCalled()
    expect((res as unknown as { body: { dispatched: number } }).body.dispatched).toBe(0)
  })

  it('dispatches followup when campaigns have eligible sends and QStash is available', async () => {
    const campaign = {
      id: 'camp-1',
      created_by: 'user-1',
      followup_days: 3,
      followup_subject: 'Follow up',
      followup_body: 'Hi {{nome}}',
      followup_max: 2,
    }
    const eligibleSend = { id: 's1', contact_id: 'c1', followup_count: 0 }

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain([campaign])  // campaigns
      if (callCount === 2) return makeChain([eligibleSend]) // eligible sends
      return makeUpdateChain()                              // update send
    })

    const { POST } = await import('@/app/api/cron/marketing-followup/route')
    const res = await POST(makeRequest(`Bearer ${CRON_SECRET}`))
    expect((res as { status: number }).status).toBe(200)
    expect((res as unknown as { body: { dispatched: number } }).body.dispatched).toBe(1)
    expect(mockPublishJSON).toHaveBeenCalledTimes(1)
    expect(mockPublishJSON).toHaveBeenCalledWith(expect.objectContaining({
      body: expect.objectContaining({ send_id: 's1', campaign_id: 'camp-1', is_followup: true }),
    }))
  })

  it('returns dispatched:0 when eligible sends list is empty', async () => {
    const campaign = {
      id: 'camp-1',
      created_by: 'user-1',
      followup_days: 3,
      followup_subject: null,
      followup_body: null,
      followup_max: 1,
    }

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain([campaign])
      return makeChain([]) // no eligible sends
    })

    const { POST } = await import('@/app/api/cron/marketing-followup/route')
    const res = await POST(makeRequest(`Bearer ${CRON_SECRET}`))
    expect((res as unknown as { body: { dispatched: number } }).body.dispatched).toBe(0)
    expect(mockPublishJSON).not.toHaveBeenCalled()
  })
})
