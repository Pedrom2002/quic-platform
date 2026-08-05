import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockResult } = vi.hoisted(() => ({
  mockResult: vi.fn(),
}))

function makeQuery() {
  const query: Record<string, unknown> = {}
  query.select = vi.fn(() => query)
  query.order = vi.fn(() => query)
  query.ilike = vi.fn(() => query)
  query.eq = vi.fn(() => query)
  query.range = vi.fn(() => query)
  query.then = (resolve: (v: unknown) => void) => resolve(mockResult())
  return query
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => makeQuery()),
  })),
}))

function req(qs: string) {
  return new NextRequest(`http://localhost/api/rentals/catalog${qs}`)
}

beforeEach(() => {
  mockResult.mockReset()
})

describe('GET /api/rentals/catalog', () => {
  it('returns materials, total and hasMore on the happy path', async () => {
    mockResult.mockReturnValue({
      data: [{ id: '1', name: 'Mesa' }],
      count: 20,
      error: null,
    })
    const { GET } = await import('@/app/api/rentals/catalog/route')
    const res = await GET(req('?page=1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.materials).toEqual([{ id: '1', name: 'Mesa' }])
    expect(body.total).toBe(20)
    expect(body.hasMore).toBe(true)
    expect(body.page).toBe(1)
  })

  it('returns hasMore false on the last page', async () => {
    mockResult.mockReturnValue({ data: [{ id: '1' }], count: 1, error: null })
    const { GET } = await import('@/app/api/rentals/catalog/route')
    const res = await GET(req('?page=1'))
    const body = await res.json()
    expect(body.hasMore).toBe(false)
  })

  it('falls back to page 1 for a non-numeric page param', async () => {
    mockResult.mockReturnValue({ data: [], count: 0, error: null })
    const { GET } = await import('@/app/api/rentals/catalog/route')
    const res = await GET(req('?page=not-a-number'))
    const body = await res.json()
    expect(body.page).toBe(1)
  })

  it('falls back to page 1 for a negative page param', async () => {
    mockResult.mockReturnValue({ data: [], count: 0, error: null })
    const { GET } = await import('@/app/api/rentals/catalog/route')
    const res = await GET(req('?page=-5'))
    const body = await res.json()
    expect(body.page).toBe(1)
  })

  it('returns an empty result set with no error when nothing matches', async () => {
    mockResult.mockReturnValue({ data: [], count: 0, error: null })
    const { GET } = await import('@/app/api/rentals/catalog/route')
    const res = await GET(req('?q=nonexistent-material-xyz'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.materials).toEqual([])
    expect(body.hasMore).toBe(false)
  })

  it('returns a 500 with a generic error message when the query fails', async () => {
    mockResult.mockReturnValue({ data: null, count: null, error: { message: 'db down' } })
    const { GET } = await import('@/app/api/rentals/catalog/route')
    const res = await GET(req('?page=1'))
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error).toBeTruthy()
  })
})
