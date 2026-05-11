import { describe, it, expect } from 'vitest'
import { audit } from '@/lib/audit'

describe('audit', () => {
  it('is a no-op and returns undefined', () => {
    const result = audit({
      action: 'create',
      userId: 'user-1',
      organizationId: 'org-1',
    })
    expect(result).toBeUndefined()
  })

  it('accepts optional eventId and metadata without throwing', () => {
    expect(() =>
      audit({
        action: 'update',
        userId: 'u',
        organizationId: 'o',
        eventId: 'e-1',
        metadata: { key: 'value' },
      })
    ).not.toThrow()
  })
})
