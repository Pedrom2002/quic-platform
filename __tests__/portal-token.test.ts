import { describe, it, expect } from 'vitest'

async function getTokenFns() {
  const mod = await import('@/lib/portal/token')
  return mod
}

describe('portal token', () => {
  it('generates a non-empty URL-safe token', async () => {
    const { signPortalToken } = await getTokenFns()
    const token = await signPortalToken('event-123')
    expect(token).toBeTruthy()
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('generates a short token (≤ 20 chars)', async () => {
    const { signPortalToken } = await getTokenFns()
    const token = await signPortalToken('event-456')
    expect(token.length).toBeLessThanOrEqual(20)
  })

  it('generates unique tokens for each call', async () => {
    const { signPortalToken } = await getTokenFns()
    const t1 = await signPortalToken('event-789')
    const t2 = await signPortalToken('event-789')
    expect(t1).not.toBe(t2)
  })
})
