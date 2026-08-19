import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOrgAuth, mockRevalidate } = vi.hoisted(() => ({
  mockRequireOrgAuth: vi.fn(),
  mockRevalidate: vi.fn(),
}))

vi.mock('@/lib/supabase/actions', () => ({ requireOrgAuth: mockRequireOrgAuth }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidate }))

function makeSupabase(investorLookup: { data: unknown }) {
  const calls: Record<string, unknown[]> = { insert: [] }
  const investorsChain = { eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue(investorLookup) }) }) }) }
  const investmentsChain = {
    insert: vi.fn((payload: unknown) => { calls.insert.push(payload); return Promise.resolve({ error: null }) }),
  }
  return {
    supabase: {
      from: vi.fn((table: string) => (table === 'investors' ? { select: vi.fn().mockReturnValue(investorsChain) } : investmentsChain)),
    },
    calls,
  }
}

function fd(obj: Record<string, string>) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(obj)) formData.set(key, value)
  return formData
}

const PROJECT_UUID = '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b'
const INVESTOR_UUID = '6a1a1f7b-8a8b-5c2b-ab3b-2d3e4f5a6b7c'

function authAs(supabase: unknown) {
  mockRequireOrgAuth.mockResolvedValue({ supabase, user: { id: 'user-1' }, member: { organization_id: 'org-1', role: 'admin' } })
}

beforeEach(() => {
  mockRequireOrgAuth.mockReset()
  mockRevalidate.mockReset()
})

describe('createInvestment', () => {
  it('rejects when investor is not approved (or does not belong to org)', async () => {
    const { supabase } = makeSupabase({ data: null })
    authAs(supabase)
    const { createInvestment } = await import('@/app/dashboard/golden-circle/projetos/[projectId]/investment-actions')
    const result = await createInvestment(PROJECT_UUID, fd({ investor_id: INVESTOR_UUID, amount_cents: '100000', invested_at: '2026-08-19' }))
    expect(result.error).toBe('Investidor inválido ou não aprovado')
  })

  it('inserts investment with project_id, status active', async () => {
    const { supabase, calls } = makeSupabase({ data: { id: INVESTOR_UUID } })
    authAs(supabase)
    const { createInvestment } = await import('@/app/dashboard/golden-circle/projetos/[projectId]/investment-actions')
    const result = await createInvestment(PROJECT_UUID, fd({ investor_id: INVESTOR_UUID, amount_cents: '100000', invested_at: '2026-08-19' }))
    expect(result.error).toBeUndefined()
    const inserted = calls.insert[0] as Record<string, unknown>
    expect(inserted.project_id).toBe(PROJECT_UUID)
    expect(inserted.investor_id).toBe(INVESTOR_UUID)
    expect(inserted.status).toBe('active')
    expect(inserted.amount_cents).toBe(100000)
    expect(mockRevalidate).toHaveBeenCalledWith(`/dashboard/golden-circle/projetos/${PROJECT_UUID}`)
  })
})
