import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: vi.fn((url: string) => ({ redirectUrl: url, status: 302 })),
  },
}))

import { GET } from '@/app/auth/callback/route'
import { createClient } from '@/lib/supabase/server'

describe('GET /auth/callback', () => {
  let mockExchangeCodeForSession: any

  beforeEach(() => {
    mockExchangeCodeForSession = vi.fn().mockResolvedValue({})
    vi.mocked(createClient).mockResolvedValue({
      auth: { exchangeCodeForSession: mockExchangeCodeForSession },
    } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /dashboard by default when no next param', async () => {
    const req = new Request('http://localhost/auth/callback?code=abc123')
    const res = await GET(req)
    expect((res as unknown as { redirectUrl: string }).redirectUrl).toBe('http://localhost/dashboard')
  })

  it('redirects to custom next param value', async () => {
    const req = new Request('http://localhost/auth/callback?code=abc&next=/events')
    const res = await GET(req)
    expect((res as unknown as { redirectUrl: string }).redirectUrl).toBe('http://localhost/events')
  })

  it('does not call exchangeCodeForSession when no code param', async () => {
    const req = new Request('http://localhost/auth/callback')
    await GET(req)
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('calls exchangeCodeForSession with the code when present', async () => {
    const req = new Request('http://localhost/auth/callback?code=mycode123')
    await GET(req)
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('mycode123')
  })

  it('still redirects when code is absent', async () => {
    const req = new Request('http://localhost/auth/callback?next=/settings')
    const res = await GET(req)
    expect((res as unknown as { redirectUrl: string }).redirectUrl).toBe('http://localhost/settings')
  })

  it('redirects to login with an error when exchangeCodeForSession fails', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: { message: 'invalid code' } })
    const req = new Request('http://localhost/auth/callback?code=badcode&next=/events')
    const res = await GET(req)
    expect((res as unknown as { redirectUrl: string }).redirectUrl).toBe('http://localhost/auth/login?error=auth_callback_failed')
  })
})
