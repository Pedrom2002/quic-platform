import { describe, it, expect } from 'vitest'
import { isValidCronAuth } from '@/lib/cron-auth'

describe('isValidCronAuth', () => {
  it('accepts a matching Bearer header', () => {
    expect(isValidCronAuth('Bearer secret-123', 'secret-123')).toBe(true)
  })

  it('rejects a wrong secret', () => {
    expect(isValidCronAuth('Bearer wrong', 'secret-123')).toBe(false)
  })

  it('rejects a missing header', () => {
    expect(isValidCronAuth(null, 'secret-123')).toBe(false)
  })

  it('rejects a header without the Bearer prefix', () => {
    expect(isValidCronAuth('secret-123', 'secret-123')).toBe(false)
  })

  it('rejects a header with different length than expected (no timingSafeEqual crash)', () => {
    expect(isValidCronAuth('Bearer short', 'a-much-longer-secret-value')).toBe(false)
  })
})
