import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSignIn, mockCreateClient, mockIsRateLimited, mockGetClientIp } = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
  mockCreateClient: vi.fn(),
  mockIsRateLimited: vi.fn(),
  mockGetClientIp: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))
vi.mock('@/lib/rate-limit', () => ({
  isRateLimited: mockIsRateLimited,
  getClientIp: mockGetClientIp,
}))

function makeRequest(body: unknown) {
  return new Request('https://app.quic.pt/api/investors/login', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  mockSignIn.mockReset()
  mockCreateClient.mockReset()
  mockIsRateLimited.mockReset()
  mockGetClientIp.mockReset()
  mockCreateClient.mockResolvedValue({ auth: { signInWithPassword: mockSignIn } })
  mockIsRateLimited.mockResolvedValue(false)
  mockGetClientIp.mockReturnValue('127.0.0.1')
})

describe('POST /api/investors/login', () => {
  it('signs in with valid credentials', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    const { POST } = await import('@/app/api/investors/login/route')
    const res = await POST(makeRequest({ email: 'maria@example.com', password: 'password123' }))

    expect(res.status).toBe(200)
    expect(mockSignIn).toHaveBeenCalledWith({ email: 'maria@example.com', password: 'password123' })
  })

  it('rejects an invalid email format', async () => {
    const { POST } = await import('@/app/api/investors/login/route')
    const res = await POST(makeRequest({ email: 'not-an-email', password: 'password123' }))

    expect(res.status).toBe(400)
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('returns 401 on wrong credentials', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    const { POST } = await import('@/app/api/investors/login/route')
    const res = await POST(makeRequest({ email: 'maria@example.com', password: 'wrong' }))

    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    mockIsRateLimited.mockResolvedValue(true)
    const { POST } = await import('@/app/api/investors/login/route')
    const res = await POST(makeRequest({ email: 'maria@example.com', password: 'password123' }))

    expect(res.status).toBe(429)
    expect(mockSignIn).not.toHaveBeenCalled()
  })
})
