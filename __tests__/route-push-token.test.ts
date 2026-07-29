// __tests__/route-push-token.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockMaybeSingle = vi.fn()
const mockUpsert = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'clients') {
        return { select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }) }
      }
      if (table === 'client_push_tokens') {
        return { upsert: mockUpsert }
      }
      throw new Error(`unexpected table ${table}`)
    },
  }),
}))

import { POST } from '@/app/api/portal/push-token/route'

function makeRequest(body: unknown, bearer = 'valid-token') {
  return new Request('https://example.com/api/portal/push-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${bearer}` },
    body: JSON.stringify(body),
  })
}

describe('POST /api/portal/push-token', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockMaybeSingle.mockReset()
    mockUpsert.mockReset()
  })

  it('devolve 401 sem Authorization header', async () => {
    const request = new Request('https://example.com/api/portal/push-token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'ExponentPushToken[abc]' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('devolve 401 quando o token de sessão é inválido', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const response = await POST(makeRequest({ token: 'ExponentPushToken[abc]' }))
    expect(response.status).toBe(401)
  })

  it('devolve 400 quando o body não tem token', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'cliente@example.com' } } })
    const response = await POST(makeRequest({}))
    expect(response.status).toBe(400)
  })

  it('devolve 404 quando não existe cliente com esse email', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'cliente@example.com' } } })
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const response = await POST(makeRequest({ token: 'ExponentPushToken[abc]' }))
    expect(response.status).toBe(404)
  })

  it('faz upsert do token e devolve 200 em sucesso', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'cliente@example.com' } } })
    mockMaybeSingle.mockResolvedValue({ data: { id: 'client-1' }, error: null })
    mockUpsert.mockResolvedValue({ error: null })

    const response = await POST(makeRequest({ token: 'ExponentPushToken[abc]' }))

    expect(response.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledWith(
      { client_id: 'client-1', token: 'ExponentPushToken[abc]' },
      { onConflict: 'client_id,token' }
    )
  })
})
