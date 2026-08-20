import { describe, it, expect } from 'vitest'

describe('GET /app', () => {
  it('returns the static marketing HTML page with the right headers', async () => {
    const { GET } = await import('@/app/app/route')
    const res = await GET()

    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=300')

    const body = await res.text()
    expect(body).toContain('<!doctype html>')
    expect(body).toContain('QUIC — App Mobile')
    expect(body).toContain('noindex, nofollow')
  })
})
