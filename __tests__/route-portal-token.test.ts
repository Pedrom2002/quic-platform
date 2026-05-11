import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/portal/data', () => ({
  getPortalData: vi.fn(),
}))

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({ body, status: init?.status ?? 200 })),
  },
}))

import { GET } from '@/app/api/portal/[token]/route'
import { getPortalData } from '@/lib/portal/data'

const mockPortalData = {
  event: { id: 'ev-1', name: 'Fest', venue_name: null, start_datetime: '2026-01-01T20:00:00Z', status: 'active' },
  items: [],
  progress: { total: 0, completed: 0, percent: 0 },
  eventDateStr: '1 de janeiro de 2026',
  heroVideo: null,
  contentVideo: null,
  eventFiles: [],
}

describe('GET /api/portal/[token]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when getPortalData returns null', async () => {
    vi.mocked(getPortalData).mockResolvedValue(null)
    const req = new Request('http://localhost/api/portal/bad')
    const res = await GET(req, { params: Promise.resolve({ token: 'bad' }) })
    expect(res.status).toBe(401)
    expect((res as { body: { error: string } }).body.error).toMatch(/inválido/)
  })

  it('returns 200 with event/items/progress when data found', async () => {
    vi.mocked(getPortalData).mockResolvedValue(mockPortalData as never)
    const req = new Request('http://localhost/api/portal/good')
    const res = await GET(req, { params: Promise.resolve({ token: 'good' }) })
    expect(res.status).toBe(200)
    const body = (res as { body: { event: { name: string }; items: unknown[]; progress: unknown } }).body
    expect(body.event.name).toBe('Fest')
    expect(body.items).toEqual([])
    expect(body.progress).toEqual({ total: 0, completed: 0, percent: 0 })
  })

  it('passes the token param to getPortalData', async () => {
    vi.mocked(getPortalData).mockResolvedValue(null)
    const req = new Request('http://localhost/api/portal/my-token-123')
    await GET(req, { params: Promise.resolve({ token: 'my-token-123' }) })
    expect(getPortalData).toHaveBeenCalledWith('my-token-123')
  })
})
