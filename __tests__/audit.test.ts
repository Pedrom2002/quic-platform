import { describe, it, expect, vi } from 'vitest'

vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

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
