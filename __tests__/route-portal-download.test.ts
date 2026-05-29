import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

// event_files lookup result — controllable per test. Default: file exists.
const { mockMaybeSingle } = vi.hoisted(() => ({
  mockMaybeSingle: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: mockMaybeSingle,
    })),
  })),
}))

vi.mock('next/server', () => {
  class MockNextResponse {
    body: unknown
    status: number
    headers: Map<string, string>

    constructor(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body
      this.status = init?.status ?? 200
      this.headers = new Map(Object.entries(init?.headers ?? {}))
    }
  }

  return {
    NextResponse: MockNextResponse,
  }
})

import { GET } from '@/app/api/portal/download/route'

function makeRequest(params: Record<string, string>): unknown {
  const searchParams = new URLSearchParams(params)
  return {
    nextUrl: { searchParams },
  }
}

describe('GET /api/portal/download', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    // Default: the requested url corresponds to a stored event file.
    mockMaybeSingle.mockReset()
    mockMaybeSingle.mockResolvedValue({ data: { id: 'file-1' } })
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('returns 403 when url is allowed-host but not a stored event file', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null })
    const req = makeRequest({ url: 'https://project.supabase.co/storage/v1/not-ours.pdf' })
    const res = await GET(req as never)
    expect(res.status).toBe(403)
  })

  it('returns 400 when url param is missing', async () => {
    const req = makeRequest({})
    const res = await GET(req as never)
    expect(res.status).toBe(400)
  })

  it('returns 400 when url is not a valid URL', async () => {
    const req = makeRequest({ url: 'not-a-url' })
    const res = await GET(req as never)
    expect(res.status).toBe(400)
  })

  it('returns 403 when host is not in allowed list', async () => {
    const req = makeRequest({ url: 'https://evil.example.com/file.pdf' })
    const res = await GET(req as never)
    expect(res.status).toBe(403)
  })

  it('allows supabase.co hosts', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/pdf' },
      body: null,
    }) as unknown as typeof fetch
    const req = makeRequest({ url: 'https://project.supabase.co/storage/v1/file.pdf' })
    const res = await GET(req as never)
    expect(res.status).toBe(200)
  })

  it('allows vercel blob storage hosts', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'image/png' },
      body: null,
    }) as unknown as typeof fetch
    const req = makeRequest({ url: 'https://abc.public.blob.vercel-storage.com/img.png' })
    const res = await GET(req as never)
    expect(res.status).toBe(200)
  })

  it('allows unsplash.com hosts', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'image/jpeg' },
      body: null,
    }) as unknown as typeof fetch
    const req = makeRequest({ url: 'https://images.unsplash.com/photo.jpg' })
    const res = await GET(req as never)
    expect(res.status).toBe(200)
  })

  it('returns 502 when upstream fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as unknown as typeof fetch
    const req = makeRequest({ url: 'https://project.supabase.co/file.pdf' })
    const res = await GET(req as never)
    expect(res.status).toBe(502)
  })

  it('returns 502 when upstream returns non-ok status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: { get: () => null },
    }) as unknown as typeof fetch
    const req = makeRequest({ url: 'https://project.supabase.co/file.pdf' })
    const res = await GET(req as never)
    expect(res.status).toBe(502)
  })

  it('uses "download" as default filename when name param missing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/pdf' },
      body: null,
    }) as unknown as typeof fetch
    const req = makeRequest({ url: 'https://project.supabase.co/file.pdf' })
    const res = await GET(req as never)
    expect(res.headers.get('Content-Disposition')).toContain('download')
  })

  it('sanitizes double-quotes in filename', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/pdf' },
      body: null,
    }) as unknown as typeof fetch
    const req = makeRequest({ url: 'https://project.supabase.co/file.pdf', name: 'my"file.pdf' })
    const res = await GET(req as never)
    expect(res.headers.get('Content-Disposition')).toContain('my_file.pdf')
    expect(res.headers.get('Content-Disposition')).not.toContain('"my"')
  })

  it('uses application/octet-stream when content-type header missing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      body: null,
    }) as unknown as typeof fetch
    const req = makeRequest({ url: 'https://project.supabase.co/file.bin' })
    const res = await GET(req as never)
    expect(res.headers.get('Content-Type')).toBe('application/octet-stream')
  })

  it('allows supabase.in hosts', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'video/mp4' },
      body: null,
    }) as unknown as typeof fetch
    const req = makeRequest({ url: 'https://project.supabase.in/storage/video.mp4' })
    const res = await GET(req as never)
    expect(res.status).toBe(200)
  })
})
