import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOrgAuth, mockRevalidate } = vi.hoisted(() => ({
  mockRequireOrgAuth: vi.fn(),
  mockRevalidate: vi.fn(),
}))

vi.mock('@/lib/supabase/actions', () => ({ requireOrgAuth: mockRequireOrgAuth }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidate }))

function makeSupabase() {
  const calls: Record<string, unknown[]> = { insert: [], update: [], eq: [] }
  function eqChain(): { eq: (col: string, val: unknown) => unknown } & Promise<{ error: null }> {
    const promise = Promise.resolve({ error: null }) as { eq: (col: string, val: unknown) => unknown } & Promise<{ error: null }>
    promise.eq = vi.fn((col: string, val: unknown) => { calls.eq.push([col, val]); return eqChain() })
    return promise
  }
  const chain = {
    insert: vi.fn((payload: unknown) => { calls.insert.push(payload); return Promise.resolve({ error: null }) }),
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
  mockRequireOrgAuth.mockResolvedValue({ supabase, user: { id: 'user-1' }, member: { organization_id: 'org-1', role: 'admin' } })
}

beforeEach(() => {
  mockRequireOrgAuth.mockReset()
  mockRevalidate.mockReset()
})

describe('createProject', () => {
  it('rejects invalid form', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { createProject } = await import('@/app/dashboard/golden-circle/projetos/actions')
    const result = await createProject(fd({ name: '  ', status: 'coming_soon', funding_goal_cents: '500000' }))
    expect(result.error).toContain('Nome obrigatório')
  })

  it('inserts with organization_id and status coming_soon', async () => {
    const { supabase, calls } = makeSupabase()
    authAs(supabase)
    const { createProject } = await import('@/app/dashboard/golden-circle/projetos/actions')
    const result = await createProject(fd({ name: 'Arena Live Lisboa', status: 'coming_soon', funding_goal_cents: '500000' }))
    expect(result.error).toBeUndefined()
    const inserted = calls.insert[0] as Record<string, unknown>
    expect(inserted.organization_id).toBe('org-1')
    expect(inserted.name).toBe('Arena Live Lisboa')
    expect(inserted.funding_goal_cents).toBe(500000)
    expect(mockRevalidate).toHaveBeenCalledWith('/dashboard/golden-circle/projetos')
  })
})

describe('updateProject', () => {
  it('rejects invalid id', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { updateProject } = await import('@/app/dashboard/golden-circle/projetos/actions')
    const result = await updateProject(fd({ id: 'nope', name: 'X', status: 'open', funding_goal_cents: '1000' }))
    expect(result.error).toBe('Projeto inválido')
  })

  it('updates all fields by id', async () => {
    const { supabase, calls } = makeSupabase()
    authAs(supabase)
    const { updateProject } = await import('@/app/dashboard/golden-circle/projetos/actions')
    const result = await updateProject(fd({ id: UUID, name: 'Arena Live Lisboa', status: 'open', funding_goal_cents: '600000' }))
    expect(result.error).toBeUndefined()
    const updated = calls.update[0] as Record<string, unknown>
    expect(updated.status).toBe('open')
    expect(updated.funding_goal_cents).toBe(600000)
    expect(mockRevalidate).toHaveBeenCalledWith('/dashboard/golden-circle/projetos')
    expect(mockRevalidate).toHaveBeenCalledWith(`/dashboard/golden-circle/projetos/${UUID}`)
  })
})
