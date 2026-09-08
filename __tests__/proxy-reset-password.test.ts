import { describe, it, expect, vi, beforeEach } from 'vitest'

// Regression test for the Critical finding: /reset-password must be reachable
// without an authenticated session, so the "link expirado ou ja foi usado"
// state can ever render. Before the fix, the middleware's isPublic allowlist
// did not include /reset-password, so an unauthenticated request was redirected
// to /auth/login before the page could render the expired-link message.

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockImplementation(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  })),
}))

import { proxy } from '@/proxy'
import { NextRequest } from 'next/server'

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, 'https://app.example.com'))
}

describe('proxy middleware — /reset-password public access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not redirect an unauthenticated request to /reset-password', async () => {
    const res = await proxy(makeRequest('/reset-password'))
    // A redirect response carries a 3xx status and a `location` header pointing
    // elsewhere; passing through the middleware means neither is the case here.
    expect(res.headers.get('location')).toBeNull()
    expect(res.status).not.toBe(307)
    expect(res.status).not.toBe(308)
  })

  it('behaves the same as the already-public /auth/login route (no redirect)', async () => {
    const resetRes = await proxy(makeRequest('/reset-password'))
    const loginRes = await proxy(makeRequest('/auth/login'))

    expect(resetRes.headers.get('location')).toBeNull()
    expect(loginRes.headers.get('location')).toBeNull()
  })

  it('does not redirect /reset-password requests with a query string either', async () => {
    const res = await proxy(makeRequest('/reset-password?origin=mobile'))
    expect(res.headers.get('location')).toBeNull()
  })
})
