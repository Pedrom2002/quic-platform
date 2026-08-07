import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSignUp, mockCreateClient, mockIsRateLimited, mockGetClientIp } = vi.hoisted(() => ({
  mockSignUp: vi.fn(),
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
  return new Request('https://app.quic.pt/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  mockSignUp.mockReset()
  mockCreateClient.mockReset()
  mockIsRateLimited.mockReset()
  mockGetClientIp.mockReset()
  mockCreateClient.mockResolvedValue({ auth: { signUp: mockSignUp } })
  mockIsRateLimited.mockResolvedValue(false)
  mockGetClientIp.mockReturnValue('127.0.0.1')
})

describe('POST /api/auth/signup', () => {
  it('creates an account with valid email and password', async () => {
    mockSignUp.mockResolvedValue({ error: null })
    const { POST } = await import('@/app/api/auth/signup/route')
    const res = await POST(makeRequest({ email: 'user@example.com', password: 'password123' }))

    expect(res.status).toBe(200)
    expect(mockSignUp).toHaveBeenCalledWith({ email: 'user@example.com', password: 'password123' })
  })

  it('rejects an invalid email', async () => {
    const { POST } = await import('@/app/api/auth/signup/route')
    const res = await POST(makeRequest({ email: 'not-an-email', password: 'password123' }))

    expect(res.status).toBe(400)
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('rejects a password shorter than 6 characters', async () => {
    const { POST } = await import('@/app/api/auth/signup/route')
    const res = await POST(makeRequest({ email: 'user@example.com', password: 'short' }))

    expect(res.status).toBe(400)
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('returns 429 when rate limited', async () => {
    mockIsRateLimited.mockResolvedValue(true)
    const { POST } = await import('@/app/api/auth/signup/route')
    const res = await POST(makeRequest({ email: 'user@example.com', password: 'password123' }))

    expect(res.status).toBe(429)
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('returns a generic error when Supabase signUp fails', async () => {
    mockSignUp.mockResolvedValue({ error: { message: 'User already registered' } })
    const { POST } = await import('@/app/api/auth/signup/route')
    const res = await POST(makeRequest({ email: 'user@example.com', password: 'password123' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('Não foi possível criar a conta. Verifica os dados ou tenta iniciar sessão.')
  })

  it('rate-limit keys are IP-scoped (different IPs do not share buckets)', async () => {
    mockSignUp.mockResolvedValue({ error: null })
    const { POST } = await import('@/app/api/auth/signup/route')

    // First request from IP 1.2.3.4
    mockGetClientIp.mockReturnValue('1.2.3.4')
    mockIsRateLimited.mockResolvedValue(false)
    await POST(makeRequest({ email: 'user1@example.com', password: 'password123' }))

    // Second request from IP 5.6.7.8
    mockGetClientIp.mockReturnValue('5.6.7.8')
    await POST(makeRequest({ email: 'user2@example.com', password: 'password123' }))

    // Verify isRateLimited was called with IP-scoped keys
    expect(mockIsRateLimited).toHaveBeenCalledWith('signup:1.2.3.4', 5, 10 * 60 * 1_000)
    expect(mockIsRateLimited).toHaveBeenCalledWith('signup:5.6.7.8', 5, 10 * 60 * 1_000)
  })
})
