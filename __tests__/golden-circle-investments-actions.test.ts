import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOrgAuth, mockRevalidate } = vi.hoisted(() => ({
  mockRequireOrgAuth: vi.fn(),
  mockRevalidate: vi.fn(),
}))

vi.mock('@/lib/supabase/actions', () => ({ requireOrgAuth: mockRequireOrgAuth }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidate }))

function makeSupabase(
  investorLookup: { data: unknown },
  projectLookup: { data: unknown } = { data: { id: PROJECT_UUID } }
) {
  const calls: Record<string, unknown[]> = { insert: [] }
  const investorsChain = { eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue(investorLookup) }) }) }) }
  const projectsChain = { eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue(projectLookup) }) }) }
  const investmentsChain = {
    insert: vi.fn((payload: unknown) => { calls.insert.push(payload); return Promise.resolve({ error: null }) }),
  }
  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'investors') return { select: vi.fn().mockReturnValue(investorsChain) }
        if (table === 'investment_projects') return { select: vi.fn().mockReturnValue(projectsChain) }
        return investmentsChain
      }),
    },
    calls,
  }
}

function makeUpdateSupabase(
  projectLookup: { data: unknown } = { data: { id: PROJECT_UUID } },
  investmentLookup: { data: unknown } = { data: { id: INVESTMENT_UUID } }
) {
  const calls: Record<string, unknown[]> = { update: [] }
  const projectsChain = { eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue(projectLookup) }) }) }
  const investmentsSelectChain = { eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue(investmentLookup) }) }) }
  const investmentsTable = {
    select: vi.fn().mockReturnValue(investmentsSelectChain),
    update: vi.fn((payload: unknown) => {
      calls.update.push(payload)
      return { eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) }
    }),
  }
  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'investment_projects') return { select: vi.fn().mockReturnValue(projectsChain) }
        if (table === 'investments') return investmentsTable
        return { select: vi.fn() }
      }),
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
const INVESTMENT_UUID = '7b2b2f8c-9b9c-6d3c-bc4c-3e4f5a6b7c8d'

function authAs(supabase: unknown) {
  mockRequireOrgAuth.mockResolvedValue({ supabase, user: { id: 'user-1' }, member: { organization_id: 'org-1', role: 'admin' } })
}

beforeEach(() => {
  mockRequireOrgAuth.mockReset()
  mockRevalidate.mockReset()
})

describe('createInvestment', () => {
  it('rejects when project does not belong to org', async () => {
    const { supabase } = makeSupabase({ data: { id: INVESTOR_UUID } }, { data: null })
    authAs(supabase)
    const { createInvestment } = await import('@/app/dashboard/golden-circle/projetos/[projectId]/investment-actions')
    const result = await createInvestment(PROJECT_UUID, fd({ investor_id: INVESTOR_UUID, amount_cents: '100000', invested_at: '2026-08-19' }))
    expect(result.error).toBe('Projeto inválido')
  })

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

describe('updateInvestment', () => {
  it('rejects when project does not belong to org', async () => {
    const { supabase } = makeUpdateSupabase({ data: null })
    authAs(supabase)
    const { updateInvestment } = await import('@/app/dashboard/golden-circle/projetos/[projectId]/investment-actions')
    const result = await updateInvestment(PROJECT_UUID, INVESTMENT_UUID, fd({
      amount_cents: '100000', invested_at: '2026-08-19', status: 'active',
    }))
    expect(result.error).toBe('Projeto inválido')
  })

  it('rejects when investment does not belong to project', async () => {
    const { supabase } = makeUpdateSupabase(undefined, { data: null })
    authAs(supabase)
    const { updateInvestment } = await import('@/app/dashboard/golden-circle/projetos/[projectId]/investment-actions')
    const result = await updateInvestment(PROJECT_UUID, INVESTMENT_UUID, fd({
      amount_cents: '100000', invested_at: '2026-08-19', status: 'active',
    }))
    expect(result.error).toBe('Investimento inválido')
  })

  it('rejects an invalid status value', async () => {
    const { supabase } = makeUpdateSupabase()
    authAs(supabase)
    const { updateInvestment } = await import('@/app/dashboard/golden-circle/projetos/[projectId]/investment-actions')
    const result = await updateInvestment(PROJECT_UUID, INVESTMENT_UUID, fd({
      amount_cents: '100000', invested_at: '2026-08-19', status: 'bogus',
    }))
    expect(result.error).toBe('Estado inválido')
  })

  it('updates amount, date, status and revalidates the project page', async () => {
    const { supabase, calls } = makeUpdateSupabase()
    authAs(supabase)
    const { updateInvestment } = await import('@/app/dashboard/golden-circle/projetos/[projectId]/investment-actions')
    const result = await updateInvestment(PROJECT_UUID, INVESTMENT_UUID, fd({
      amount_cents: '250000', invested_at: '2026-08-20', status: 'returned', realized_return_cents: '30000',
    }))
    expect(result.error).toBeUndefined()
    const updated = calls.update[0] as Record<string, unknown>
    expect(updated.amount_cents).toBe(250000)
    expect(updated.status).toBe('returned')
    expect(updated.realized_return_cents).toBe(30000)
    expect(mockRevalidate).toHaveBeenCalledWith(`/dashboard/golden-circle/projetos/${PROJECT_UUID}`)
  })
})
