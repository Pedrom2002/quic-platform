import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetPortalData, mockIsRateLimited } = vi.hoisted(() => ({
  mockGetPortalData: vi.fn(),
  mockIsRateLimited: vi.fn(),
}))

vi.mock('@/lib/portal/data', () => ({
  getPortalData: mockGetPortalData,
}))

vi.mock('@/lib/rate-limit', () => ({
  isRateLimited: mockIsRateLimited,
  getClientIp: () => '203.0.113.1',
}))

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({ body, status: init?.status ?? 200 })),
  },
}))

import { GET } from '@/app/api/portal/[token]/route'

const mockPortalData = {
  event: { id: 'ev-1', name: 'Fest', venue_name: null, start_datetime: '2026-01-01T20:00:00Z', status: 'active' },
  items: [],
  progress: { total: 0, completed: 0, percent: 0 },
  eventDateStr: '1 de janeiro de 2026',
  heroVideo: null,
  contentVideo: null,
  eventFiles: [
    { id: 'ef-1', file_name: 'planta.pdf', file_size: 1024, mime_type: 'application/pdf', blob_url: 'https://x/planta.pdf' },
  ],
  articles: [
    { id: 'art-1', title: 'Festival é destaque na imprensa', url: 'https://noticia.pt/1', source: 'Jornal X', created_at: '2026-01-05T10:00:00Z' },
  ],
  reports: [
    { id: 'rep-1', title: 'Relatório técnico', type: 'technical' as const, file_name: 'relatorio.pdf', file_size: 2048, mime_type: 'application/pdf', blob_url: 'https://x/relatorio.pdf', created_at: '2026-01-06T10:00:00Z' },
  ],
}

describe('GET /api/portal/[token]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsRateLimited.mockResolvedValue(false)
  })

  it('returns 429 when rate limited', async () => {
    mockIsRateLimited.mockResolvedValue(true)
    const req = new Request('http://localhost/api/portal/good')
    const res = await GET(req, { params: Promise.resolve({ token: 'good' }) })
    expect(res.status).toBe(429)
    expect(mockGetPortalData).not.toHaveBeenCalled()
    expect(mockIsRateLimited).toHaveBeenCalledWith('portal-token:203.0.113.1', 20, 5 * 60 * 1_000)
  })

  it('returns 401 when getPortalData returns null', async () => {
    mockGetPortalData.mockResolvedValue(null)
    const req = new Request('http://localhost/api/portal/bad')
    const res = await GET(req, { params: Promise.resolve({ token: 'bad' }) })
    expect(res.status).toBe(401)
    expect((res as unknown as { body: { error: string } }).body.error).toMatch(/inválido/)
  })

  it('returns 200 with event/items/progress when data found', async () => {
    mockGetPortalData.mockResolvedValue(mockPortalData)
    const req = new Request('http://localhost/api/portal/good')
    const res = await GET(req, { params: Promise.resolve({ token: 'good' }) })
    expect(res.status).toBe(200)
    const body = (res as unknown as { body: { event: { name: string }; items: unknown[]; progress: unknown } }).body
    expect(body.event.name).toBe('Fest')
    expect(body.items).toEqual([])
    expect(body.progress).toEqual({ total: 0, completed: 0, percent: 0 })
  })

  it('passes the token param to getPortalData', async () => {
    mockGetPortalData.mockResolvedValue(null)
    const req = new Request('http://localhost/api/portal/my-token-123')
    await GET(req, { params: Promise.resolve({ token: 'my-token-123' }) })
    expect(mockGetPortalData).toHaveBeenCalledWith('my-token-123')
  })

  it('returns articles, reports and eventFiles alongside the existing fields', async () => {
    mockGetPortalData.mockResolvedValue(mockPortalData)
    const req = new Request('http://localhost/api/portal/good')
    const res = await GET(req, { params: Promise.resolve({ token: 'good' }) })
    const body = (res as unknown as {
      body: {
        articles: Array<{ id: string; title: string }>
        reports: Array<{ id: string; title: string }>
        eventFiles: Array<{ id: string; file_name: string }>
      }
    }).body
    expect(body.articles).toEqual(mockPortalData.articles)
    expect(body.reports).toEqual(mockPortalData.reports)
    expect(body.eventFiles).toEqual(mockPortalData.eventFiles)
  })
})
