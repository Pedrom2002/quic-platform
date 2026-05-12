import { describe, it, expect, beforeAll } from 'vitest'

beforeAll(() => {
  process.env.PORTAL_JWT_SECRET = 'test-secret-at-least-32-chars-long!!'
})

// Dynamic import after env is set, because the module reads the env at module level
async function getTokenFns() {
  const mod = await import('@/lib/portal/token')
  return mod
}

describe('portal token', () => {
  it('signs and verifies a token round-trip', async () => {
    const { signPortalToken, verifyPortalToken } = await getTokenFns()
    const token = await signPortalToken('event-123')
    const payload = await verifyPortalToken(token)
    expect(payload).not.toBeNull()
    expect(payload?.eventId).toBe('event-123')
  })

  it('returns null for a tampered token', async () => {
    const { signPortalToken, verifyPortalToken } = await getTokenFns()
    const token = await signPortalToken('event-456')
    const tampered = token.slice(0, -5) + 'XXXXX'
    const payload = await verifyPortalToken(tampered)
    expect(payload).toBeNull()
  })

  it('returns null for an empty string', async () => {
    const { verifyPortalToken } = await getTokenFns()
    const payload = await verifyPortalToken('')
    expect(payload).toBeNull()
  })

  it('returns null for a random string', async () => {
    const { verifyPortalToken } = await getTokenFns()
    const payload = await verifyPortalToken('not.a.jwt')
    expect(payload).toBeNull()
  })

  it('payload includes iat field and no exp field', async () => {
    const { signPortalToken, verifyPortalToken } = await getTokenFns()
    const token = await signPortalToken('event-789')
    const payload = await verifyPortalToken(token)
    expect(payload?.iat).toBeTypeOf('number')
    expect(payload?.exp).toBeUndefined()
  })
})
