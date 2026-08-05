import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }) },
  }),
}))

const mockRedirect = vi.fn((url: string) => ({ url } as Response))

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      redirect: mockRedirect,
    },
  }
})

describe('auth callback route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('redirects to /dashboard by default', async () => {
    const { GET } = await import('./route')
    await GET(new Request('http://localhost/auth/callback?code=abc'))
    expect(mockRedirect).toHaveBeenCalledWith('http://localhost/dashboard')
  })

  it('redirects to valid internal next param', async () => {
    const { GET } = await import('./route')
    await GET(new Request('http://localhost/auth/callback?code=abc&next=/dashboard/events'))
    expect(mockRedirect).toHaveBeenCalledWith('http://localhost/dashboard/events')
  })

  it('rejects external redirect and falls back to /dashboard', async () => {
    const { GET } = await import('./route')
    await GET(new Request('http://localhost/auth/callback?code=abc&next=https://evil.com'))
    expect(mockRedirect).toHaveBeenCalledWith('http://localhost/dashboard')
  })

  it('rejects protocol-relative redirect', async () => {
    const { GET } = await import('./route')
    await GET(new Request('http://localhost/auth/callback?code=abc&next=//evil.com'))
    expect(mockRedirect).toHaveBeenCalledWith('http://localhost/dashboard')
  })

  it('rejects next param that does not start with /', async () => {
    const { GET } = await import('./route')
    await GET(new Request('http://localhost/auth/callback?code=abc&next=evil.com/phish'))
    expect(mockRedirect).toHaveBeenCalledWith('http://localhost/dashboard')
  })

  it('rejects backslash-prefixed redirect', async () => {
    const { GET } = await import('./route')
    await GET(new Request('http://localhost/auth/callback?code=abc&next=/\\evil.com'))
    expect(mockRedirect).toHaveBeenCalledWith('http://localhost/dashboard')
  })
})
