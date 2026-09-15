/**
 * Tests for GET /api/cron/marketing-maintenance
 * (runs bounce polling as the single daily Vercel-Hobby cron).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockBounce } = vi.hoisted(() => ({
  mockBounce: vi.fn(),
}))

vi.mock('@/lib/marketing/maintenance', () => ({
  runBouncePoll: mockBounce,
}))

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: { status?: number }) => ({ body, status: init?.status ?? 200 })),
  },
}))

const CRON_SECRET = 'test-cron-secret-minimum-32-chars-pad!'
function req(authHeader?: string) {
  return new Request('http://localhost/api/cron/marketing-maintenance', {
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

beforeEach(() => {
  process.env.CRON_SECRET = CRON_SECRET
  mockBounce.mockReset().mockResolvedValue({ processed: 1 })
})

describe('GET /api/cron/marketing-maintenance', () => {
  it('returns 401 when authorization is missing', async () => {
    const { GET } = await import('@/app/api/cron/marketing-maintenance/route')
    const res = await GET(req())
    expect((res as { status: number }).status).toBe(401)
    expect(mockBounce).not.toHaveBeenCalled()
  })

  it('returns 401 when authorization is wrong', async () => {
    const { GET } = await import('@/app/api/cron/marketing-maintenance/route')
    const res = await GET(req('Bearer nope'))
    expect((res as { status: number }).status).toBe(401)
  })

  it('runs the bounce-poll task and returns its result', async () => {
    const { GET } = await import('@/app/api/cron/marketing-maintenance/route')
    const res = await GET(req(`Bearer ${CRON_SECRET}`))
    expect((res as { status: number }).status).toBe(200)
    expect(mockBounce).toHaveBeenCalledTimes(1)
    expect((res as unknown as { body: unknown }).body).toEqual({
      bounce: { processed: 1 },
    })
  })
})
