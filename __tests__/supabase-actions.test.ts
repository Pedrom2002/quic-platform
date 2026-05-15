import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveOrgMember, assertEventOwnership } from '@/lib/supabase/actions'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

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

// ─── Auth helpers ─────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'
import { requireOrgAuth, requireOrgAuthFull, getOrgAuth, getOrgAuthFull } from '@/lib/supabase/actions'

function makeAuthSupabase(user: unknown, memberData: unknown) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: memberData }),
    }),
  }
}

describe('requireOrgAuth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns { supabase, user, member } when authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthSupabase({ id: 'u1' }, { organization_id: 'org-1', role: 'member' }) as never
    )
    const ctx = await requireOrgAuth()
    expect(ctx.user).toMatchObject({ id: 'u1' })
    expect(ctx.member).toMatchObject({ organization_id: 'org-1', role: 'member' })
  })

  it('throws Não autenticado when no user', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthSupabase(null, null) as never)
    await expect(requireOrgAuth()).rejects.toThrow('Não autenticado')
  })

  it('throws Não autorizado when user exists but no team member', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthSupabase({ id: 'u1' }, null) as never)
    await expect(requireOrgAuth()).rejects.toThrow('Não autorizado')
  })
})

describe('requireOrgAuthFull', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns full member data when authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthSupabase({ id: 'u1' }, { id: 'm1', full_name: 'Ana Costa', organization_id: 'org-1', role: 'admin' }) as never
    )
    const ctx = await requireOrgAuthFull()
    expect(ctx.member.id).toBe('m1')
    expect(ctx.member.full_name).toBe('Ana Costa')
    expect(ctx.member.role).toBe('admin')
  })

  it('throws Não autenticado when no user', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthSupabase(null, null) as never)
    await expect(requireOrgAuthFull()).rejects.toThrow('Não autenticado')
  })

  it('throws Não autorizado when no team member', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthSupabase({ id: 'u1' }, null) as never)
    await expect(requireOrgAuthFull()).rejects.toThrow('Não autorizado')
  })
})

describe('getOrgAuth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns context when authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthSupabase({ id: 'u1' }, { organization_id: 'org-1', role: 'member' }) as never
    )
    const ctx = await getOrgAuth()
    expect(ctx).not.toBeNull()
    expect(ctx!.member.organization_id).toBe('org-1')
  })

  it('returns null when no user', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthSupabase(null, null) as never)
    expect(await getOrgAuth()).toBeNull()
  })

  it('returns null when user has no team member', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthSupabase({ id: 'u1' }, null) as never)
    expect(await getOrgAuth()).toBeNull()
  })
})

describe('getOrgAuthFull', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns full context when authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthSupabase({ id: 'u1' }, { id: 'm2', full_name: 'Rui Silva', organization_id: 'org-2', role: 'member' }) as never
    )
    const ctx = await getOrgAuthFull()
    expect(ctx).not.toBeNull()
    expect(ctx!.member.full_name).toBe('Rui Silva')
    expect(ctx!.member.id).toBe('m2')
  })

  it('returns null when no user', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthSupabase(null, null) as never)
    expect(await getOrgAuthFull()).toBeNull()
  })

  it('returns null when user has no team member', async () => {
    vi.mocked(createClient).mockResolvedValue(makeAuthSupabase({ id: 'u1' }, null) as never)
    expect(await getOrgAuthFull()).toBeNull()
  })
})
