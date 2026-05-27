/**
 * Tests for marketing tracking & action routes:
 *   - GET /api/marketing/track/click
 *   - GET /api/marketing/track/open
 *   - GET /api/marketing/unsubscribe
 *   - POST /api/marketing/contacts/import
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockFrom, mockRpc, mockNextResponseJson, mockNextResponseRedirect, mockServerFrom, mockGetUser } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockNextResponseJson: vi.fn(),
  mockNextResponseRedirect: vi.fn(),
  mockServerFrom: vi.fn(),
  mockGetUser: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser }, from: mockServerFrom })),
}))

vi.mock('next/server', () => {
  function MockNextResponse(body: unknown, init?: { status?: number }) {
    return { _body: body, status: (init as { status?: number } | undefined)?.status ?? 200 }
  }
  MockNextResponse.json = mockNextResponseJson
  MockNextResponse.redirect = mockNextResponseRedirect
  return { NextResponse: MockNextResponse }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Simulate NextRequest.nextUrl.searchParams
function makeNextReq(url: string): unknown {
  const parsed = new URL(url)
  return { nextUrl: { searchParams: parsed.searchParams } }
}

function makeSingleChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data }),
  }
}

function makeUpdateChain() {
  return {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  }
}

function makeUpsertChain(error: unknown = null) {
  return {
    upsert: vi.fn().mockResolvedValue({ error }),
  }
}

// Valid RFC4122 UUIDs (version 4, variant 8)
const UUID_LIST = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

// ─── GET /api/marketing/track/click ──────────────────────────────────────────

describe('GET /api/marketing/track/click', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockNextResponseJson.mockImplementation((body: unknown, init?: { status?: number }) => ({
      body, status: init?.status ?? 200,
    }))
    mockNextResponseRedirect.mockImplementation((url: string) => ({ redirect_url: String(url), status: 307 }))
  })

  it('returns 400 when url param is missing', async () => {
    const { GET } = await import('@/app/api/marketing/track/click/route')
    const res = await GET(makeNextReq('http://localhost/api/marketing/track/click') as never)
    expect((res as { status: number }).status).toBe(400)
  })

  it('returns 400 when url is not http/https', async () => {
    const { GET } = await import('@/app/api/marketing/track/click/route')
    const res = await GET(makeNextReq('http://localhost/api/marketing/track/click?url=ftp://bad.com') as never)
    expect((res as { status: number }).status).toBe(400)
  })

  it('redirects to url when sid is absent', async () => {
    const { GET } = await import('@/app/api/marketing/track/click/route')
    const res = await GET(makeNextReq('http://localhost/api/marketing/track/click?url=https%3A%2F%2Fdestination.com') as never)
    expect(mockFrom).not.toHaveBeenCalled()
    expect((res as unknown as { redirect_url: string }).redirect_url).toBe('https://destination.com')
  })

  it('records click and redirects when sid is present and send found', async () => {
    const singleChain = makeSingleChain({ id: 's1', contact_id: 'c1' })
    const updateChain = makeUpdateChain()
    let calls = 0
    mockFrom.mockImplementation(() => {
      calls++
      if (calls === 1) return singleChain
      return updateChain
    })

    const { GET } = await import('@/app/api/marketing/track/click/route')
    const res = await GET(makeNextReq('http://localhost/api/marketing/track/click?url=https%3A%2F%2Fdest.com&sid=s1') as never)
    expect(mockRpc).toHaveBeenCalledWith('marketing_increment_score', expect.objectContaining({ p_contact_id: 'c1' }))
    expect((res as unknown as { redirect_url: string }).redirect_url).toBe('https://dest.com')
  })

  it('redirects without DB update when send not found', async () => {
    mockFrom.mockReturnValue(makeSingleChain(null))
    const { GET } = await import('@/app/api/marketing/track/click/route')
    await GET(makeNextReq('http://localhost/api/marketing/track/click?url=https%3A%2F%2Fdest.com&sid=missing') as never)
    expect(mockRpc).not.toHaveBeenCalled()
  })
})

// ─── GET /api/marketing/track/open ───────────────────────────────────────────

describe('GET /api/marketing/track/open', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockNextResponseJson.mockImplementation((body: unknown, init?: { status?: number }) => ({
      body, status: init?.status ?? 200,
    }))
  })

  it('returns pixel (200) when sid is absent', async () => {
    const { GET } = await import('@/app/api/marketing/track/open/route')
    const res = await GET(makeNextReq('http://localhost/api/marketing/track/open') as never)
    expect(mockFrom).not.toHaveBeenCalled()
    expect((res as { status: number }).status).toBe(200)
  })

  it('records open and returns pixel when status=sent', async () => {
    const singleChain = makeSingleChain({ id: 's1', contact_id: 'c1', status: 'sent' })
    const updateChain = makeUpdateChain()
    let calls = 0
    mockFrom.mockImplementation(() => {
      calls++
      if (calls === 1) return singleChain
      return updateChain
    })

    const { GET } = await import('@/app/api/marketing/track/open/route')
    const res = await GET(makeNextReq('http://localhost/api/marketing/track/open?sid=s1') as never)
    expect((res as { status: number }).status).toBe(200)
    expect(mockRpc).toHaveBeenCalledWith('marketing_increment_score', expect.objectContaining({ p_contact_id: 'c1' }))
  })

  it('returns pixel without update when status is already opened', async () => {
    mockFrom.mockReturnValue(makeSingleChain({ id: 's1', contact_id: 'c1', status: 'opened' }))
    const { GET } = await import('@/app/api/marketing/track/open/route')
    await GET(makeNextReq('http://localhost/api/marketing/track/open?sid=s1') as never)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('returns pixel without update when send not found', async () => {
    mockFrom.mockReturnValue(makeSingleChain(null))
    const { GET } = await import('@/app/api/marketing/track/open/route')
    await GET(makeNextReq('http://localhost/api/marketing/track/open?sid=missing') as never)
    expect(mockRpc).not.toHaveBeenCalled()
  })
})

// ─── GET /api/marketing/unsubscribe ──────────────────────────────────────────

describe('GET /api/marketing/unsubscribe', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockNextResponseJson.mockImplementation((body: unknown, init?: { status?: number }) => ({
      body, status: init?.status ?? 200,
    }))
  })

  it('returns 400 when sid is absent', async () => {
    const { GET } = await import('@/app/api/marketing/unsubscribe/route')
    const res = await GET(makeNextReq('http://localhost/api/marketing/unsubscribe') as never)
    expect((res as { status: number }).status).toBe(400)
  })

  it('returns 404 when send not found', async () => {
    mockFrom.mockReturnValue(makeSingleChain(null))
    const { GET } = await import('@/app/api/marketing/unsubscribe/route')
    const res = await GET(makeNextReq('http://localhost/api/marketing/unsubscribe?sid=unknown') as never)
    expect((res as { status: number }).status).toBe(404)
  })

  it('unsubscribes and returns 200 when send found', async () => {
    const singleChain = makeSingleChain({ id: 's1', contact_id: 'c1' })
    const updateChain = makeUpdateChain()
    let calls = 0
    mockFrom.mockImplementation((table: string) => {
      calls++
      if (calls === 1) return singleChain
      if (table === 'marketing_sends') return updateChain
      return updateChain // marketing_contacts
    })

    const { GET } = await import('@/app/api/marketing/unsubscribe/route')
    const res = await GET(makeNextReq('http://localhost/api/marketing/unsubscribe?sid=s1') as never)
    expect((res as { status: number }).status).toBe(200)
    expect(mockRpc).toHaveBeenCalledWith('marketing_increment_score', expect.objectContaining({ p_contact_id: 'c1' }))
  })
})

// ─── POST /api/marketing/contacts/import ─────────────────────────────────────

describe('POST /api/marketing/contacts/import', () => {
  beforeEach(() => {
    mockServerFrom.mockReset()
    mockNextResponseJson.mockImplementation((body: unknown, init?: { status?: number }) => ({
      body, status: init?.status ?? 200,
    }))
    // Default: user is authenticated
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const { POST } = await import('@/app/api/marketing/contacts/import/route')
    const req = new Request('http://localhost/api/marketing/contacts/import', {
      method: 'POST',
      body: JSON.stringify({ contacts: [] }),
    })
    const res = await POST(req)
    expect((res as { status: number }).status).toBe(401)
  })

  it('returns 400 when payload is invalid', async () => {
    const { POST } = await import('@/app/api/marketing/contacts/import/route')
    const req = new Request('http://localhost/api/marketing/contacts/import', {
      method: 'POST',
      body: JSON.stringify({ contacts: [{ email: 'not-valid-email!!' }] }),
    })
    const res = await POST(req)
    expect((res as { status: number }).status).toBe(400)
  })

  it('returns 500 when upsert fails', async () => {
    mockServerFrom.mockReturnValue(makeUpsertChain({ message: 'DB error' }))
    const { POST } = await import('@/app/api/marketing/contacts/import/route')
    const req = new Request('http://localhost/api/marketing/contacts/import', {
      method: 'POST',
      body: JSON.stringify({
        contacts: [{ list_id: UUID_LIST, email: 'test@example.com' }],
      }),
    })
    const res = await POST(req)
    expect((res as { status: number }).status).toBe(500)
  })

  it('returns 200 with imported count on success', async () => {
    mockServerFrom.mockReturnValue(makeUpsertChain(null))
    const { POST } = await import('@/app/api/marketing/contacts/import/route')
    const req = new Request('http://localhost/api/marketing/contacts/import', {
      method: 'POST',
      body: JSON.stringify({
        contacts: [
          { list_id: UUID_LIST, email: 'alice@example.com', name: 'Alice' },
          { list_id: UUID_LIST, email: 'bob@example.com' },
        ],
      }),
    })
    const res = await POST(req)
    expect((res as { status: number }).status).toBe(200)
    expect((res as unknown as { body: { imported: number } }).body.imported).toBe(2)
  })
})
