import { describe, it, expect } from 'vitest'
import { generatePortalToken } from '@/lib/portal/token'

describe('portal token', () => {
  it('generates a non-empty URL-safe token', () => {
    const token = generatePortalToken()
    expect(token).toBeTruthy()
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('generates a short token (≤ 20 chars)', () => {
    const token = generatePortalToken()
    expect(token.length).toBeLessThanOrEqual(20)
  })

  it('generates unique tokens for each call', () => {
    const t1 = generatePortalToken()
    const t2 = generatePortalToken()
    expect(t1).not.toBe(t2)
  })
})
