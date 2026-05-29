/**
 * Tests for GET /api/cron/marketing-maintenance
 * (bundles follow-ups + bounce polling into one daily Vercel-Hobby cron).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFollowup, mockBounce } = vi.hoisted(() => ({
  mockFollowup: vi.fn(),
  mockBounce: vi.fn(),
}))

vi.mock('@/lib/marketing/maintenance', () => ({
  runMarketingFollowup: mockFollowup,
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
  mockFollowup.mockReset().mockResolvedValue({ dispatched: 2 })
  mockBounce.mockReset().mockResolvedValue({ processed: 1 })
})

describe('GET /api/cron/marketing-maintenance', () => {
  it('returns 401 when authorization is missing', async () => {
    const { GET } = await import('@/app/api/cron/marketing-maintenance/route')
    const res = await GET(req())
    expect((res as { status: number }).status).toBe(401)
    expect(mockFollowup).not.toHaveBeenCalled()
    expect(mockBounce).not.toHaveBeenCalled()
  })

  it('returns 401 when authorization is wrong', async () => {
    const { GET } = await import('@/app/api/cron/marketing-maintenance/route')
    const res = await GET(req('Bearer nope'))
    expect((res as { status: number }).status).toBe(401)
  })

  it('runs both tasks and returns their combined result', async () => {
    const { GET } = await import('@/app/api/cron/marketing-maintenance/route')
    const res = await GET(req(`Bearer ${CRON_SECRET}`))
    expect((res as { status: number }).status).toBe(200)
    expect(mockFollowup).toHaveBeenCalledTimes(1)
    expect(mockBounce).toHaveBeenCalledTimes(1)
    expect((res as unknown as { body: unknown }).body).toEqual({
      followup: { dispatched: 2 },
      bounce: { processed: 1 },
    })
  })
})
