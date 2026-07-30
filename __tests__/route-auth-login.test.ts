import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSignInWithPassword, mockIsRateLimited } = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
  mockIsRateLimited: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { signInWithPassword: mockSignInWithPassword } })),
}))
vi.mock('@/lib/rate-limit', () => ({
  isRateLimited: mockIsRateLimited,
  getClientIp: () => '203.0.113.1',
}))

function req(body: unknown) {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  mockSignInWithPassword.mockReset()
  mockIsRateLimited.mockReset()
  mockIsRateLimited.mockResolvedValue(false)
})

describe('POST /api/auth/login', () => {
  it('returns 429 when rate limited', async () => {
    mockIsRateLimited.mockResolvedValue(true)
    const { POST } = await import('@/app/api/auth/login/route')
    const res = await POST(req({ email: 'a@example.com', password: 'secret' }))
    expect(res.status).toBe(429)
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })

  it('returns 400 on invalid payload', async () => {
    const { POST } = await import('@/app/api/auth/login/route')
    const res = await POST(req({ email: 'not-an-email', password: '' }))
    expect(res.status).toBe(400)
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })

  it('returns 401 on invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    const { POST } = await import('@/app/api/auth/login/route')
    const res = await POST(req({ email: 'a@example.com', password: 'wrong' }))
    expect(res.status).toBe(401)
  })

  it('returns 200 on valid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })
    const { POST } = await import('@/app/api/auth/login/route')
    const res = await POST(req({ email: 'a@example.com', password: 'correct' }))
    expect(res.status).toBe(200)
    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'a@example.com', password: 'correct' })
  })
})
