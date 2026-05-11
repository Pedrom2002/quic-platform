import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockPublishJSON, mockFrom } = vi.hoisted(() => ({
  mockPublishJSON: vi.fn().mockResolvedValue({ messageId: 'qm-1' }),
  mockFrom: vi.fn(),
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
  createAdminClient: vi.fn().mockReturnValue({ from: mockFrom }),
}))

import { GET } from '@/app/api/cron/process-scheduled/route'

function makeRequest(authHeader?: string) {
  return new Request('http://localhost/api/cron/process-scheduled', {
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

// Build the fetch chain for notification_jobs (the initial SELECT query)
function makeFetchChain(data: unknown[], error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data, error }),
  }
}

// Build the claim chain: update().in().eq() - used to mark jobs as 'processing'
function makeClaimChain(error: unknown = null) {
  return {
    update: vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error }),
      }),
    }),
  }
}

// Build the per-job update chain: update().eq() - used to set qstash_message_id or failed
function makeUpdateEqChain() {
  return {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  }
}

// Build the clients fetch chain: select().in()
function makeClientsChain(clients: unknown[]) {
  return {
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ data: clients }),
    }),
  }
}

type AnyChain = ReturnType<typeof makeFetchChain> | ReturnType<typeof makeClaimChain> | ReturnType<typeof makeClientsChain> | ReturnType<typeof makeUpdateEqChain>

// Wire up mockFrom so that:
//   first call to 'notification_jobs' -> fetchChain (SELECT)
//   second call to 'notification_jobs' -> claimChain (UPDATE...IN...EQ)
//   subsequent calls to 'notification_jobs' -> updateEqChain (UPDATE...EQ per job)
//   any call to 'clients' -> clientsChain
function wireFrom(
  fetchChain: ReturnType<typeof makeFetchChain>,
  claimChain: ReturnType<typeof makeClaimChain>,
  clientsChain: ReturnType<typeof makeClientsChain>,
  perJobChains: ReturnType<typeof makeUpdateEqChain>[] = [],
) {
  let notificationJobsCallCount = 0
  mockFrom.mockImplementation((table: string): AnyChain => {
    if (table === 'clients') return clientsChain
    // table === 'notification_jobs'
    notificationJobsCallCount++
    if (notificationJobsCallCount === 1) return fetchChain
    if (notificationJobsCallCount === 2) return claimChain
    // 3rd+ calls are per-job updates (after publishJSON)
    const idx = notificationJobsCallCount - 3
    return perJobChains[idx] ?? makeUpdateEqChain()
  })
}

describe('GET /api/cron/process-scheduled', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'my-secret'
    process.env.QSTASH_TOKEN = 'qstash-token'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
    vi.clearAllMocks()
    mockPublishJSON.mockResolvedValue({ messageId: 'qm-1' })
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

  it('returns 500 when QSTASH_TOKEN not set', async () => {
    delete process.env.QSTASH_TOKEN
    const res = await GET(makeRequest('Bearer my-secret'))
    expect(res.status).toBe(500)
  })

  it('returns 500 when DB fetch fails', async () => {
    const fetchChain = makeFetchChain([], { message: 'DB error' })
    const claimChain = makeClaimChain()
    const clientsChain = makeClientsChain([])
    wireFrom(fetchChain, claimChain, clientsChain)

    const res = await GET(makeRequest('Bearer my-secret'))
    expect(res.status).toBe(500)
  })

  it('returns {processed:0, hasMore:false} when no jobs', async () => {
    const fetchChain = makeFetchChain([])
    const claimChain = makeClaimChain()
    const clientsChain = makeClientsChain([])
    wireFrom(fetchChain, claimChain, clientsChain)

    const res = await GET(makeRequest('Bearer my-secret'))
    expect(res.status).toBe(200)
    expect((res as { body: { processed: number; hasMore: boolean } }).body).toEqual({
      processed: 0,
      hasMore: false,
    })
  })

  it('returns 500 when claimErr is set', async () => {
    const jobs = [
      {
        id: 'j1', event_id: 'e1', client_id: 'c1', channel: 'email',
        rendered_subject: null, rendered_body: 'B', qstash_message_id: null,
      },
    ]
    const fetchChain = makeFetchChain(jobs)
    const claimChain = makeClaimChain({ message: 'claim error' })
    const clientsChain = makeClientsChain([])
    wireFrom(fetchChain, claimChain, clientsChain)

    const res = await GET(makeRequest('Bearer my-secret'))
    expect(res.status).toBe(500)
  })

  it('returns 500 when NEXT_PUBLIC_APP_URL not set after fetching jobs', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL

    const jobs = [
      {
        id: 'j1', event_id: 'e1', client_id: 'c1', channel: 'email',
        rendered_subject: null, rendered_body: 'B', qstash_message_id: null,
      },
    ]
    const fetchChain = makeFetchChain(jobs)
    const claimChain = makeClaimChain()
    const clientsChain = makeClientsChain([])
    wireFrom(fetchChain, claimChain, clientsChain)

    const res = await GET(makeRequest('Bearer my-secret'))
    expect(res.status).toBe(500)
  })

  it('processes jobs and returns counts', async () => {
    const jobs = [
      {
        id: 'j1', event_id: 'e1', client_id: 'c1', channel: 'email',
        rendered_subject: 'Sub', rendered_body: 'Body', qstash_message_id: null,
      },
    ]
    const fetchChain = makeFetchChain(jobs)
    const claimChain = makeClaimChain()
    const clientsChain = makeClientsChain([{ id: 'c1', email: 'c@x.com', phone: null, whatsapp: null }])
    const perJobChain = makeUpdateEqChain()
    wireFrom(fetchChain, claimChain, clientsChain, [perJobChain])

    mockPublishJSON.mockResolvedValue({ messageId: 'qm-ok' })

    const res = await GET(makeRequest('Bearer my-secret'))
    expect(res.status).toBe(200)
    const body = (res as { body: { processed: number; failed: number; hasMore: boolean } }).body
    expect(body.processed).toBe(1)
    expect(body.failed).toBe(0)
    expect(body.hasMore).toBe(false)
  })

  it('sets hasMore:true when 51 jobs returned', async () => {
    const jobs = Array.from({ length: 51 }, (_, i) => ({
      id: `j${i}`, event_id: 'e1', client_id: 'c1', channel: 'email',
      rendered_subject: null, rendered_body: 'B', qstash_message_id: null,
    }))
    const fetchChain = makeFetchChain(jobs)
    const claimChain = makeClaimChain()
    const clientsChain = makeClientsChain([])
    // 50 per-job update chains (one per dispatched job)
    const perJobChains = Array.from({ length: 50 }, () => makeUpdateEqChain())
    wireFrom(fetchChain, claimChain, clientsChain, perJobChains)

    const res = await GET(makeRequest('Bearer my-secret'))
    expect((res as { body: { hasMore: boolean } }).body.hasMore).toBe(true)
  })

  it('counts failed jobs when publishJSON rejects', async () => {
    const jobs = [
      {
        id: 'j1', event_id: 'e1', client_id: 'c1', channel: 'email',
        rendered_subject: null, rendered_body: 'B', qstash_message_id: null,
      },
    ]
    const fetchChain = makeFetchChain(jobs)
    const claimChain = makeClaimChain()
    const clientsChain = makeClientsChain([])
    // On failure, the error handler calls update().eq() on 'notification_jobs'
    const perJobChain = makeUpdateEqChain()
    wireFrom(fetchChain, claimChain, clientsChain, [perJobChain])

    mockPublishJSON.mockRejectedValue(new Error('QStash down'))

    const res = await GET(makeRequest('Bearer my-secret'))
    const body = (res as { body: { processed: number; failed: number } }).body
    expect(body.failed).toBe(1)
    expect(body.processed).toBe(0)
  })
})
