// __tests__/route-account-delete.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockAdminGetUser, mockAdminRpc, mockIsRateLimited, mockGetClientIp } = vi.hoisted(() => ({
  mockAdminGetUser: vi.fn(),
  mockAdminRpc: vi.fn(),
  mockIsRateLimited: vi.fn(),
  mockGetClientIp: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { getUser: mockAdminGetUser },
    rpc: mockAdminRpc,
  }),
}))
vi.mock('@/lib/rate-limit', () => ({
  isRateLimited: mockIsRateLimited,
  getClientIp: mockGetClientIp,
}))

function makeRequest(headers?: Record<string, string>) {
  return new Request('https://app.quic.pt/api/account/delete', { method: 'POST', headers })
}

beforeEach(() => {
  mockAdminGetUser.mockReset()
  mockAdminRpc.mockReset()
  mockIsRateLimited.mockReset()
  mockGetClientIp.mockReset()
  mockIsRateLimited.mockResolvedValue(false)
  mockGetClientIp.mockReturnValue('203.0.113.1')
})

describe('POST /api/account/delete', () => {
  it('returns 429 when rate limited', async () => {
    mockIsRateLimited.mockResolvedValue(true)
    const { POST } = await import('@/app/api/account/delete/route')

    const res = await POST(makeRequest({ authorization: 'Bearer t1' }))

    expect(res.status).toBe(429)
    expect(mockAdminGetUser).not.toHaveBeenCalled()
  })

  it('returns 401 when there is no bearer token', async () => {
    const { POST } = await import('@/app/api/account/delete/route')

    const res = await POST(makeRequest())

    expect(res.status).toBe(401)
  })

  it('returns 401 when the token does not resolve to a user', async () => {
    mockAdminGetUser.mockResolvedValue({ data: { user: null } })
    const { POST } = await import('@/app/api/account/delete/route')

    const res = await POST(makeRequest({ authorization: 'Bearer bad-token' }))

    expect(res.status).toBe(401)
    expect(mockAdminRpc).not.toHaveBeenCalled()
  })

  it('calls delete_own_account with the authenticated user id and returns 200', async () => {
    mockAdminGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockAdminRpc.mockResolvedValue({ data: { success: true }, error: null })
    const { POST } = await import('@/app/api/account/delete/route')

    const res = await POST(makeRequest({ authorization: 'Bearer good-token' }))
    const body = await res.json()

    expect(mockAdminRpc).toHaveBeenCalledWith('delete_own_account', { p_auth_user_id: 'user-1' })
    expect(res.status).toBe(200)
    expect(body).toEqual({ success: true })
  })

  it('returns 500 when the RPC errors', async () => {
    mockAdminGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockAdminRpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const { POST } = await import('@/app/api/account/delete/route')

    const res = await POST(makeRequest({ authorization: 'Bearer good-token' }))

    expect(res.status).toBe(500)
  })

  it('returns 500 when the RPC reports success: false', async () => {
    mockAdminGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockAdminRpc.mockResolvedValue({ data: { success: false, error: 'utilizador invalido' }, error: null })
    const { POST } = await import('@/app/api/account/delete/route')

    const res = await POST(makeRequest({ authorization: 'Bearer good-token' }))

    expect(res.status).toBe(500)
  })
})
