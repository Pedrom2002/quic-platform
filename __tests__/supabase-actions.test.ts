import { describe, it, expect, vi } from 'vitest'
import { resolveOrgMember, assertEventOwnership } from '@/lib/supabase/actions'

const makeSupabase = (returnData: unknown) => ({
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnData }),
  }),
})

describe('resolveOrgMember', () => {
  it('returns member data when found', async () => {
    const supabase = makeSupabase({ organization_id: 'org-1', role: 'admin' })
    const result = await resolveOrgMember(supabase as never, 'user-1')
    expect(result).toEqual({ organization_id: 'org-1', role: 'admin' })
  })

  it('returns null when member not found', async () => {
    const supabase = makeSupabase(null)
    const result = await resolveOrgMember(supabase as never, 'user-x')
    expect(result).toBeNull()
  })
})

describe('assertEventOwnership', () => {
  it('returns true when event belongs to org', async () => {
    const supabase = makeSupabase({ id: 'ev-1' })
    const result = await assertEventOwnership(supabase as never, 'ev-1', 'org-1')
    expect(result).toBe(true)
  })

  it('returns false when event not found (data is null)', async () => {
    const supabase = makeSupabase(null)
    const result = await assertEventOwnership(supabase as never, 'ev-x', 'org-1')
    expect(result).toBe(false)
  })
})
