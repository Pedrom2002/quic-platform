import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSignUp, mockSignIn, mockInsert, mockSelect, mockCreateClient, mockIsRateLimited, mockGetClientIp } = vi.hoisted(() => ({
  mockSignUp: vi.fn(),
  mockSignIn: vi.fn(),
  mockInsert: vi.fn(),
  mockSelect: vi.fn(),
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
  return new Request('https://app.quic.pt/api/investors/signup', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  mockSignUp.mockReset()
  mockSignIn.mockReset()
  mockInsert.mockReset()
  mockSelect.mockReset()
  mockCreateClient.mockReset()
  mockIsRateLimited.mockReset()
  mockGetClientIp.mockReset()
  mockSelect.mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  })
  mockCreateClient.mockResolvedValue({
    auth: { signUp: mockSignUp, signInWithPassword: mockSignIn },
    from: vi.fn().mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
    }),
  })
  mockIsRateLimited.mockResolvedValue(false)
  mockGetClientIp.mockReturnValue('127.0.0.1')
})

describe('POST /api/investors/signup', () => {
  it('creates auth user and investor row with valid data', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockInsert.mockResolvedValue({ error: null })
    const { POST } = await import('@/app/api/investors/signup/route')
    const res = await POST(makeRequest({
      fullName: 'Maria Silva',
      email: 'maria@example.com',
      password: 'password123',
      phone: '912345678',
    }))

    expect(res.status).toBe(200)
    expect(mockSignUp).toHaveBeenCalledWith({ email: 'maria@example.com', password: 'password123' })
    expect(mockInsert).toHaveBeenCalledWith({
      auth_user_id: 'user-1',
      organization_id: '00000000-0000-0000-0000-000000000001',
      full_name: 'Maria Silva',
      email: 'maria@example.com',
      phone: '912345678',
      status: 'pending',
    })
  })

  it('rejects missing full name', async () => {
    const { POST } = await import('@/app/api/investors/signup/route')
    const res = await POST(makeRequest({ email: 'maria@example.com', password: 'password123' }))

    expect(res.status).toBe(400)
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('rejects an invalid email', async () => {
    const { POST } = await import('@/app/api/investors/signup/route')
    const res = await POST(makeRequest({ fullName: 'Maria Silva', email: 'not-an-email', password: 'password123' }))

    expect(res.status).toBe(400)
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('rejects a password shorter than 6 characters', async () => {
    const { POST } = await import('@/app/api/investors/signup/route')
    const res = await POST(makeRequest({ fullName: 'Maria Silva', email: 'maria@example.com', password: 'short' }))

    expect(res.status).toBe(400)
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('returns 429 when rate limited', async () => {
    mockIsRateLimited.mockResolvedValue(true)
    const { POST } = await import('@/app/api/investors/signup/route')
    const res = await POST(makeRequest({ fullName: 'Maria Silva', email: 'maria@example.com', password: 'password123' }))

    expect(res.status).toBe(429)
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('returns a generic error when signUp fails and the credentials do not match an existing account', async () => {
    mockSignUp.mockResolvedValue({ data: { user: null }, error: { message: 'User already registered' } })
    mockSignIn.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid login credentials' } })
    const { POST } = await import('@/app/api/investors/signup/route')
    const res = await POST(makeRequest({ fullName: 'Maria Silva', email: 'maria@example.com', password: 'password123' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('Não foi possível criar a conta. Verifica os dados ou tenta iniciar sessão.')
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('recovers an orphaned auth account: signUp fails, but the credentials match an existing user with no investors row', async () => {
    mockSignUp.mockResolvedValue({ data: { user: null }, error: { message: 'User already registered' } })
    mockSignIn.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })
    mockInsert.mockResolvedValue({ error: null })
    const { POST } = await import('@/app/api/investors/signup/route')
    const res = await POST(makeRequest({
      fullName: 'Maria Silva',
      email: 'maria@example.com',
      password: 'password123',
      phone: '912345678',
    }))

    expect(res.status).toBe(200)
    expect(mockSignIn).toHaveBeenCalledWith({ email: 'maria@example.com', password: 'password123' })
    expect(mockInsert).toHaveBeenCalledWith({
      auth_user_id: 'user-1',
      organization_id: '00000000-0000-0000-0000-000000000001',
      full_name: 'Maria Silva',
      email: 'maria@example.com',
      phone: '912345678',
      status: 'pending',
    })
  })

  it('signUp fails, credentials match an existing user, but an investors row already exists (double submit)', async () => {
    mockSignUp.mockResolvedValue({ data: { user: null }, error: { message: 'User already registered' } })
    mockSignIn.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'investor-1' }, error: null }),
      }),
    })
    const { POST } = await import('@/app/api/investors/signup/route')
    const res = await POST(makeRequest({ fullName: 'Maria Silva', email: 'maria@example.com', password: 'password123' }))

    expect(res.status).toBe(200)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns a generic error when investor row insert fails', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockInsert.mockResolvedValue({ error: { message: 'insert failed' } })
    const { POST } = await import('@/app/api/investors/signup/route')
    const res = await POST(makeRequest({ fullName: 'Maria Silva', email: 'maria@example.com', password: 'password123' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('Conta criada mas houve um erro ao registar o perfil. Contacta-nos.')
  })
})
