import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockPublishJSON, mockFrom, mockRpc } = vi.hoisted(() => ({
  mockPublishJSON: vi.fn().mockResolvedValue({ messageId: 'qm-1' }),
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}))

vi.mock('@upstash/qstash', () => {
  return {
    Client: function Client() {
      return { publishJSON: mockPublishJSON }
    },
  }
})

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({ body, status: init?.status ?? 200 })),
  },
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockReturnValue({ from: mockFrom, rpc: mockRpc }),
}))

import { GET } from '@/app/api/cron/process-scheduled/route'

function makeRequest(authHeader?: string) {
  return new Request('http://localhost/api/cron/process-scheduled', {
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

// claim_notification_jobs is an RPC; the route calls .rpc(...).returns<T>() and awaits.
// Return a thenable that also exposes .returns() (which returns itself).
function makeClaimResult(data: unknown[] | null, error: unknown = null) {
  const thenable: Record<string, unknown> = {
    returns: () => thenable,
    then: (onFulfilled: (v: { data: unknown[] | null; error: unknown }) => unknown) =>
      Promise.resolve({ data, error }).then(onFulfilled),
  }
  return thenable
}

// notification_jobs chain used for BOTH the remaining-count query
// (select().eq().is().lte() -> { count }) and per-job updates (update().eq()).
function makeJobsChain(count = 0, updateError: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue({ count }),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: updateError }),
    }),
  }
}

function makeClientsChain(clients: unknown[]) {
  return {
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ data: clients }),
    }),
  }
}

function wireFrom(jobsChain: ReturnType<typeof makeJobsChain>, clientsChain: ReturnType<typeof makeClientsChain>) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'clients') return clientsChain
    return jobsChain // notification_jobs: remaining-count query + per-job updates
  })
}

describe('GET /api/cron/process-scheduled', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'my-secret-for-cron-tests-32chars!!'
    process.env.QSTASH_TOKEN = 'qstash-token'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
    vi.clearAllMocks()
    mockPublishJSON.mockResolvedValue({ messageId: 'qm-1' })
    mockRpc.mockReturnValue(makeClaimResult([]))
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
    delete process.env.QSTASH_TOKEN
    delete process.env.NEXT_PUBLIC_APP_URL
  })

  it('returns 500 when CRON_SECRET not set', async () => {
    delete process.env.CRON_SECRET
    const res = await GET(makeRequest('Bearer x'))
    expect(res.status).toBe(500)
  })

  it('returns 401 when authorization header is missing', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 when authorization header is wrong', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('no-ops gracefully when QSTASH_TOKEN not set (empty queue)', async () => {
    delete process.env.QSTASH_TOKEN
    mockRpc.mockReturnValue(makeClaimResult([]))
    wireFrom(makeJobsChain(), makeClientsChain([]))

    const res = await GET(makeRequest('Bearer my-secret-for-cron-tests-32chars!!'))
    expect(res.status).toBe(200)
    expect((res as unknown as { body: { processed: number; hasMore: boolean } }).body).toEqual({
      processed: 0,
      hasMore: false,
    })
  })

  it('returns 500 when claim RPC fails', async () => {
    mockRpc.mockReturnValue(makeClaimResult(null, { message: 'DB error' }))
    wireFrom(makeJobsChain(), makeClientsChain([]))

    const res = await GET(makeRequest('Bearer my-secret-for-cron-tests-32chars!!'))
    expect(res.status).toBe(500)
  })

  it('returns {processed:0, hasMore:false} when no jobs', async () => {
    mockRpc.mockReturnValue(makeClaimResult([]))
    wireFrom(makeJobsChain(), makeClientsChain([]))

    const res = await GET(makeRequest('Bearer my-secret-for-cron-tests-32chars!!'))
    expect(res.status).toBe(200)
    expect((res as unknown as { body: { processed: number; hasMore: boolean } }).body).toEqual({
      processed: 0,
      hasMore: false,
    })
  })

  it('returns 200 with failed:1 when publishJSON rejects for a job', async () => {
    const jobs = [
      { id: 'j1', event_id: 'e1', client_id: 'c1', channel: 'email', rendered_subject: null, rendered_body: 'B' },
    ]
    mockRpc.mockReturnValue(makeClaimResult(jobs))
    wireFrom(makeJobsChain(), makeClientsChain([]))

    mockPublishJSON.mockRejectedValueOnce(new Error('QStash down'))

    const res = await GET(makeRequest('Bearer my-secret-for-cron-tests-32chars!!'))
    expect(res.status).toBe(200)
    const body = (res as unknown as { body: { processed: number; failed: number } }).body
    expect(body.failed).toBe(1)
    expect(body.processed).toBe(0)
  })

  it('returns 500 when NEXT_PUBLIC_APP_URL not set', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL

    const res = await GET(makeRequest('Bearer my-secret-for-cron-tests-32chars!!'))
    expect(res.status).toBe(500)
  })

  it('processes jobs and returns counts', async () => {
    const jobs = [
      { id: 'j1', event_id: 'e1', client_id: 'c1', channel: 'email', rendered_subject: 'Sub', rendered_body: 'Body' },
    ]
    mockRpc.mockReturnValue(makeClaimResult(jobs))
    wireFrom(makeJobsChain(0), makeClientsChain([{ id: 'c1', email: 'c@x.com', phone: null, whatsapp: null }]))

    mockPublishJSON.mockResolvedValue({ messageId: 'qm-ok' })

    const res = await GET(makeRequest('Bearer my-secret-for-cron-tests-32chars!!'))
    expect(res.status).toBe(200)
    const body = (res as unknown as { body: { processed: number; failed: number; hasMore: boolean } }).body
    expect(body.processed).toBe(1)
    expect(body.failed).toBe(0)
    expect(body.hasMore).toBe(false)
  })

  it('sets hasMore:true when more queued jobs remain after the batch', async () => {
    const jobs = [
      { id: 'j1', event_id: 'e1', client_id: 'c1', channel: 'email', rendered_subject: null, rendered_body: 'B' },
    ]
    mockRpc.mockReturnValue(makeClaimResult(jobs))
    // remaining-count query reports 5 jobs still queued
    wireFrom(makeJobsChain(5), makeClientsChain([]))

    const res = await GET(makeRequest('Bearer my-secret-for-cron-tests-32chars!!'))
    expect((res as unknown as { body: { hasMore: boolean } }).body.hasMore).toBe(true)
  })

  it('counts failed jobs when publishJSON rejects (multiple)', async () => {
    const jobs = [
      { id: 'j1', event_id: 'e1', client_id: 'c1', channel: 'email', rendered_subject: null, rendered_body: 'B' },
      { id: 'j2', event_id: 'e1', client_id: 'c2', channel: 'email', rendered_subject: null, rendered_body: 'B2' },
    ]
    mockRpc.mockReturnValue(makeClaimResult(jobs))
    wireFrom(makeJobsChain(), makeClientsChain([]))

    mockPublishJSON.mockRejectedValue(new Error('QStash down'))

    const res = await GET(makeRequest('Bearer my-secret-for-cron-tests-32chars!!'))
    const body = (res as unknown as { body: { processed: number; failed: number } }).body
    expect(body.failed).toBe(2)
    expect(body.processed).toBe(0)
  })
})
