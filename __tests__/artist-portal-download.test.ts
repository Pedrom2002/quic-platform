import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}))

import { GET } from '@/app/api/artist-portal/download/route'

const BLOB_URL = 'https://abc.public.blob.vercel-storage.com/rider.pdf'

function req(params: Record<string, string>) {
  const url = new URL('http://localhost/api/artist-portal/download')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return new NextRequest(url)
}

function mockTables({
  artist,
  asset,
}: {
  artist: { id: string; is_active: boolean; portal_token_expires_at: string | null } | null
  asset: { id: string } | null
}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'artists') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: artist, error: null }),
          }),
        }),
      }
    }
    if (table === 'artist_assets') {
      const chain = {
        select: vi.fn(),
        eq: vi.fn(),
        limit: vi.fn(),
        maybeSingle: vi.fn().mockResolvedValue({ data: asset, error: null }),
      }
      chain.select.mockReturnValue(chain)
      chain.eq.mockReturnValue(chain)
      chain.limit.mockReturnValue(chain)
      return chain
    }
    throw new Error(`tabela inesperada: ${table}`)
  })
}

const activeArtist = { id: 'artist-1', is_active: true, portal_token_expires_at: null }

beforeEach(() => {
  mockFrom.mockReset()
  vi.unstubAllGlobals()
})

describe('GET /api/artist-portal/download', () => {
  it('400 without params', async () => {
    const res = await GET(req({}))
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
    mockTables({ artist: null, asset: null })
    const res = await GET(req({ token: 'bad', url: BLOB_URL }))
    expect(res.status).toBe(401)
  })

  it('401 for expired portal', async () => {
    mockTables({
      artist: { ...activeArtist, portal_token_expires_at: '2020-01-01T00:00:00Z' },
      asset: { id: 'a1' },
    })
    const res = await GET(req({ token: 'tok', url: BLOB_URL }))
    expect(res.status).toBe(401)
  })

  it('403 when url does not belong to the artist', async () => {
    mockTables({ artist: activeArtist, asset: null })
    const res = await GET(req({ token: 'tok', url: BLOB_URL }))
    expect(res.status).toBe(403)
  })

  it('200 streams the file with attachment header', async () => {
    mockTables({ artist: activeArtist, asset: { id: 'a1' } })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('pdf-bytes', { status: 200, headers: { 'content-type': 'application/pdf' } })
      )
    )
    const res = await GET(req({ token: 'tok', url: BLOB_URL, name: 'rider.pdf' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition')).toContain('rider.pdf')
    expect(res.headers.get('content-type')).toBe('application/pdf')
  })
})
