import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}))

import { GET } from '@/app/api/portal/download/route'

const BLOB_URL = 'https://project.supabase.co/storage/v1/file.pdf'

function req(params: Record<string, string>) {
  const url = new URL('http://localhost/api/portal/download')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return new NextRequest(url)
}

function mockTables({
  event,
  file,
}: {
  event: { id: string; portal_token_expires_at: string | null } | null
  file: { id: string } | null
}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'events') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: event, error: null }),
          }),
        }),
      }
    }
    if (table === 'event_files') {
      const chain = {
        select: vi.fn(),
        eq: vi.fn(),
        limit: vi.fn(),
        maybeSingle: vi.fn().mockResolvedValue({ data: file, error: null }),
      }
      chain.select.mockReturnValue(chain)
      chain.eq.mockReturnValue(chain)
      chain.limit.mockReturnValue(chain)
      return chain
    }
    throw new Error(`tabela inesperada: ${table}`)
  })
}

const activeEvent = { id: 'event-1', portal_token_expires_at: null }

beforeEach(() => {
  mockFrom.mockReset()
  vi.unstubAllGlobals()
})

describe('GET /api/portal/download', () => {
  it('400 without params', async () => {
    const res = await GET(req({}))
    expect(res.status).toBe(400)
  })

  it('400 when url param is missing', async () => {
    const res = await GET(req({ token: 'tok' }))
    expect(res.status).toBe(400)
  })

  it('400 for invalid url', async () => {
    const res = await GET(req({ token: 'tok', url: 'not-a-url' }))
    expect(res.status).toBe(400)
  })

  it('403 for disallowed host', async () => {
    const res = await GET(req({ token: 'tok', url: 'https://evil.example.com/x.pdf' }))
    expect(res.status).toBe(403)
  })

  it('401 for unknown token', async () => {
    mockTables({ event: null, file: null })
    const res = await GET(req({ token: 'bad', url: BLOB_URL }))
    expect(res.status).toBe(401)
  })

  it('401 for expired portal', async () => {
    mockTables({
      event: { ...activeEvent, portal_token_expires_at: '2020-01-01T00:00:00Z' },
      file: { id: 'f1' },
    })
    const res = await GET(req({ token: 'tok', url: BLOB_URL }))
    expect(res.status).toBe(401)
  })

  it('403 when url is allowed-host but not a stored file for this event', async () => {
    mockTables({ event: activeEvent, file: null })
    const res = await GET(req({ token: 'tok', url: BLOB_URL }))
    expect(res.status).toBe(403)
  })

  it('403 when url belongs to a DIFFERENT event/org than the caller token grants access to', async () => {
    // event_files lookup must be scoped by event_id — a blob_url that exists
    // in the table but belongs to another event must not resolve for this
    // token, even though it passes the allowed-host check.
    const eventFilesEq = vi.fn()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'events') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: activeEvent, error: null }),
            }),
          }),
        }
      }
      if (table === 'event_files') {
        const chain: Record<string, unknown> = {
          select: vi.fn(),
          eq: eventFilesEq,
          limit: vi.fn(),
          // Simulates a blob_url that exists in event_files but for a
          // different event_id — the org-scoped filter must exclude it.
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
        chain.select = vi.fn().mockReturnValue(chain)
        eventFilesEq.mockReturnValue(chain)
        chain.limit = vi.fn().mockReturnValue(chain)
        return chain
      }
      throw new Error(`tabela inesperada: ${table}`)
    })

    const res = await GET(req({ token: 'tok', url: BLOB_URL }))
    expect(res.status).toBe(403)
    // Confirms the fix: the event_files query filters by event_id, not just blob_url.
    expect(eventFilesEq).toHaveBeenCalledWith('event_id', activeEvent.id)
  })

  it('200 streams the file with attachment header', async () => {
    mockTables({ event: activeEvent, file: { id: 'f1' } })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('pdf-bytes', { status: 200, headers: { 'content-type': 'application/pdf' } })
      )
    )
    const res = await GET(req({ token: 'tok', url: BLOB_URL, name: 'file.pdf' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition')).toContain('file.pdf')
    expect(res.headers.get('content-type')).toBe('application/pdf')
  })

  it('allows vercel blob storage hosts', async () => {
    mockTables({ event: activeEvent, file: { id: 'f1' } })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('img-bytes', { status: 200, headers: { 'content-type': 'image/png' } })
      )
    )
    const res = await GET(req({ token: 'tok', url: 'https://abc.public.blob.vercel-storage.com/img.png' }))
    expect(res.status).toBe(200)
  })

  it('allows unsplash.com hosts', async () => {
    mockTables({ event: activeEvent, file: { id: 'f1' } })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('img-bytes', { status: 200, headers: { 'content-type': 'image/jpeg' } })
      )
    )
    const res = await GET(req({ token: 'tok', url: 'https://images.unsplash.com/photo.jpg' }))
    expect(res.status).toBe(200)
  })

  it('allows supabase.in hosts', async () => {
    mockTables({ event: activeEvent, file: { id: 'f1' } })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('video-bytes', { status: 200, headers: { 'content-type': 'video/mp4' } })
      )
    )
    const res = await GET(req({ token: 'tok', url: 'https://project.supabase.in/storage/video.mp4' }))
    expect(res.status).toBe(200)
  })

  it('502 when upstream fetch throws', async () => {
    mockTables({ event: activeEvent, file: { id: 'f1' } })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    const res = await GET(req({ token: 'tok', url: BLOB_URL }))
    expect(res.status).toBe(502)
  })

  it('502 when upstream returns non-ok status', async () => {
    mockTables({ event: activeEvent, file: { id: 'f1' } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403 })))
    const res = await GET(req({ token: 'tok', url: BLOB_URL }))
    expect(res.status).toBe(502)
  })

  it('uses "download" as default filename when name param missing', async () => {
    mockTables({ event: activeEvent, file: { id: 'f1' } })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('pdf-bytes', { status: 200, headers: { 'content-type': 'application/pdf' } })
      )
    )
    const res = await GET(req({ token: 'tok', url: BLOB_URL }))
    expect(res.headers.get('content-disposition')).toContain('download')
  })

  it('sanitizes double-quotes in filename', async () => {
    mockTables({ event: activeEvent, file: { id: 'f1' } })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('pdf-bytes', { status: 200, headers: { 'content-type': 'application/pdf' } })
      )
    )
    const res = await GET(req({ token: 'tok', url: BLOB_URL, name: 'my"file.pdf' }))
    expect(res.headers.get('content-disposition')).toContain('my_file.pdf')
    expect(res.headers.get('content-disposition')).not.toContain('"my"')
  })

  it('uses application/octet-stream when content-type header missing', async () => {
    mockTables({ event: activeEvent, file: { id: 'f1' } })
    const upstream = new Response(null, { status: 200 })
    upstream.headers.delete('content-type')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(upstream))
    const res = await GET(req({ token: 'tok', url: BLOB_URL }))
    expect(res.headers.get('content-type')).toBe('application/octet-stream')
  })
})
