import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGenerateToken = vi.hoisted(() => vi.fn())

vi.mock('@vercel/blob/client', () => ({
  generateClientTokenFromReadWriteToken: mockGenerateToken,
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/env', () => ({ getEnv: () => ({ BLOB_READ_WRITE_TOKEN: 'test-blob-rw-token' }) }))
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({ body: data, status: init?.status ?? 200 }),
  },
}))

import { createClient } from '@/lib/supabase/server'
import { GET } from '@/app/api/events/[eventId]/files/token/route'

const EVENT_ID = 'aaaabbbb-cccc-dddd-eeee-ffffaaaabbbb'
const BASE_URL = `http://localhost/api/events/${EVENT_ID}/files/token`

function makeSupabase(user: unknown, member: unknown, event: unknown) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'team_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: member }),
        }
      }
      if (table === 'events') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: event }),
        }
      }
      return {}
    }),
  }
}

describe('GET /api/events/[eventId]/files/token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateToken.mockResolvedValue('client-blob-token-xyz')
  })

  it('returns 401 when no authenticated user', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(null, null, null) as never)
    const res = await GET(new Request(BASE_URL), { params: Promise.resolve({ eventId: EVENT_ID }) })
    expect(res.status).toBe(401)
  })

  it('returns 401 when user has no team member', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ id: 'u1' }, null, null) as never
    )
    const res = await GET(new Request(BASE_URL), { params: Promise.resolve({ eventId: EVENT_ID }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when event does not belong to org', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ id: 'u1' }, { id: 'm1', organization_id: 'org-1' }, null) as never
    )
    const res = await GET(new Request(BASE_URL), { params: Promise.resolve({ eventId: EVENT_ID }) })
    expect(res.status).toBe(404)
  })

  it('returns 415 for a disallowed MIME type', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ id: 'u1' }, { id: 'm1', organization_id: 'org-1' }, { id: EVENT_ID }) as never
    )
    const req = new Request(`${BASE_URL}?filename=logo.svg&mimeType=image/svg%2Bxml`)
    const res = await GET(req, { params: Promise.resolve({ eventId: EVENT_ID }) })
    expect(res.status).toBe(415)
  })

  it('returns 415 for an executable MIME type', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ id: 'u1' }, { id: 'm1', organization_id: 'org-1' }, { id: EVENT_ID }) as never
    )
    const req = new Request(`${BASE_URL}?filename=run.exe&mimeType=application/x-msdownload`)
    const res = await GET(req, { params: Promise.resolve({ eventId: EVENT_ID }) })
    expect(res.status).toBe(415)
  })

  it('returns token and pathname for a valid PDF upload', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ id: 'u1' }, { id: 'm1', organization_id: 'org-1' }, { id: EVENT_ID }) as never
    )
    const req = new Request(`${BASE_URL}?filename=contract.pdf&mimeType=application/pdf`)
    const res = await GET(req, { params: Promise.resolve({ eventId: EVENT_ID }) })
    expect(res.status).toBe(200)
    expect((res as unknown as { body: { token: string; pathname: string } }).body.token).toBe('client-blob-token-xyz')
    expect((res as unknown as { body: { token: string; pathname: string } }).body.pathname).toContain('contract')
  })

  it('skips MIME validation when mimeType param is absent', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ id: 'u1' }, { id: 'm1', organization_id: 'org-1' }, { id: EVENT_ID }) as never
    )
    const req = new Request(`${BASE_URL}?filename=photo.jpg`)
    const res = await GET(req, { params: Promise.resolve({ eventId: EVENT_ID }) })
    expect(res.status).toBe(200)
  })

  it('returns token for a valid image upload', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ id: 'u1' }, { id: 'm1', organization_id: 'org-1' }, { id: EVENT_ID }) as never
    )
    const req = new Request(`${BASE_URL}?filename=photo.jpg&mimeType=image/jpeg`)
    const res = await GET(req, { params: Promise.resolve({ eventId: EVENT_ID }) })
    expect(res.status).toBe(200)
    expect(mockGenerateToken).toHaveBeenCalledOnce()
  })
})
