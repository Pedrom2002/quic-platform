import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOrgAuthFull, mockRevalidate } = vi.hoisted(() => ({
  mockRequireOrgAuthFull: vi.fn(),
  mockRevalidate: vi.fn(),
}))

vi.mock('@/lib/supabase/actions', () => ({ requireOrgAuthFull: mockRequireOrgAuthFull }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidate }))

function makeSupabase() {
  const calls: Record<string, unknown[]> = { update: [], eq: [] }
  function eqChain(): { eq: (col: string, val: unknown) => unknown } & Promise<{ error: null }> {
    const promise = Promise.resolve({ error: null }) as { eq: (col: string, val: unknown) => unknown } & Promise<{ error: null }>
    promise.eq = vi.fn((col: string, val: unknown) => {
      calls.eq.push([col, val])
      return eqChain()
    })
    return promise
  }
  const chain = {
    update: vi.fn((payload: unknown) => {
      calls.update.push(payload)
      return { eq: vi.fn((col: string, val: unknown) => { calls.eq.push([col, val]); return eqChain() }) }
    }),
  }
  return { supabase: { from: vi.fn(() => chain) }, calls }
}

function fd(obj: Record<string, string>) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(obj)) formData.set(key, value)
  return formData
}

const UUID = '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b'

function authAs(supabase: unknown) {
  mockRequireOrgAuthFull.mockResolvedValue({
    supabase,
    user: { id: 'user-1' },
    member: { id: 'member-1', full_name: 'Ana', organization_id: 'org-1', role: 'admin' },
  })
}

beforeEach(() => {
  mockRequireOrgAuthFull.mockReset()
  mockRevalidate.mockReset()
})

describe('approveInvestor', () => {
  it('rejects unauthenticated', async () => {
    mockRequireOrgAuthFull.mockRejectedValue(new Error('Não autenticado'))
    const { approveInvestor } = await import('@/app/dashboard/golden-circle/investidores/actions')
    const result = await approveInvestor(fd({ id: UUID }))
    expect(result.error).toBe('Sem permissões')
  })

  it('rejects invalid id', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { approveInvestor } = await import('@/app/dashboard/golden-circle/investidores/actions')
    const result = await approveInvestor(fd({ id: 'nope' }))
    expect(result.error).toBe('Investidor inválido')
  })

  it('sets status approved, approved_at and approved_by_team_member_id', async () => {
    const { supabase, calls } = makeSupabase()
    authAs(supabase)
    const { approveInvestor } = await import('@/app/dashboard/golden-circle/investidores/actions')
    const result = await approveInvestor(fd({ id: UUID }))
    expect(result.error).toBeUndefined()
    const updated = calls.update[0] as Record<string, unknown>
    expect(updated.status).toBe('approved')
    expect(updated.approved_by_team_member_id).toBe('member-1')
    expect(typeof updated.approved_at).toBe('string')
    expect(calls.eq).toContainEqual(['id', UUID])
    expect(calls.eq).toContainEqual(['organization_id', 'org-1'])
    expect(mockRevalidate).toHaveBeenCalledWith('/dashboard/golden-circle/investidores')
  })
})

describe('rejectInvestor', () => {
  it('sets status rejected', async () => {
    const { supabase, calls } = makeSupabase()
    authAs(supabase)
    const { rejectInvestor } = await import('@/app/dashboard/golden-circle/investidores/actions')
    const result = await rejectInvestor(fd({ id: UUID }))
    expect(result.error).toBeUndefined()
    const updated = calls.update[0] as Record<string, unknown>
    expect(updated.status).toBe('rejected')
    expect(mockRevalidate).toHaveBeenCalledWith('/dashboard/golden-circle/investidores')
  })
})
