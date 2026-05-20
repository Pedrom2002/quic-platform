import { describe, it, expect, vi } from 'vitest'

vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { audit } from '@/lib/audit'

describe('audit', () => {
  it('is a no-op and returns undefined', () => {
    const result = audit({
      action: 'event.created',
      userId: 'user-1',
      organizationId: 'org-1',
    })
    expect(result).toBeUndefined()
  })

  it('accepts optional eventId and metadata without throwing', () => {
    expect(() =>
      audit({
        action: 'client.update.sent',
        userId: 'u',
        organizationId: 'o',
        eventId: 'e-1',
        meta: { key: 'value' },
      })
    ).not.toThrow()
  })
})
