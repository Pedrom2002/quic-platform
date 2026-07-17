import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOrgAuth, mockRevalidate, mockRedirect, mockCreateClient } = vi.hoisted(() => ({
  mockRequireOrgAuth: vi.fn(),
  mockRevalidate: vi.fn(),
  mockRedirect: vi.fn(),
  mockCreateClient: vi.fn(),
}))

vi.mock('@/lib/supabase/actions', () => ({ requireOrgAuth: mockRequireOrgAuth }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidate }))
vi.mock('next/navigation', () => ({ redirect: mockRedirect }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }))

const UUID = '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b'

type TableResults = Record<string, unknown>

// from(table) devolve chain genérico; await resolve para results[table].
function makeSupabase(results: TableResults) {
  const inserts: Record<string, unknown[]> = {}
  const updates: Record<string, unknown[]> = {}
  const from = vi.fn((table: string) => {
    const c: Record<string, unknown> = {}
    const self = () => c
    for (const m of ['select', 'eq', 'is', 'order', 'limit', 'maybeSingle', 'single', 'delete']) {
      c[m] = vi.fn(self)
    }
    c.insert = vi.fn((payload: unknown) => {
      inserts[table] = inserts[table] ?? []
      inserts[table].push(payload)
      return c
    })
    c.update = vi.fn((payload: unknown) => {
      updates[table] = updates[table] ?? []
      updates[table].push(payload)
      return c
    })
    ;(c as { then?: unknown }).then = (resolve: (v: unknown) => void) =>
      resolve(results[table] ?? { data: null, error: null })
    return c
  })
  const storage = {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://cdn.example.com/foto.png' } })),
    })),
  }
  return { supabase: { from, storage }, inserts, updates }
}

function authAs(supabase: unknown, role = 'manager') {
  mockRequireOrgAuth.mockResolvedValue({
    supabase,
    user: { id: 'user-1' },
    member: { organization_id: 'org-1', role },
  })
  mockCreateClient.mockResolvedValue(supabase)
}

function fd(obj: Record<string, string | File>) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(obj)) formData.set(key, value)
  return formData
}

beforeEach(() => {
  mockRequireOrgAuth.mockReset()
  mockRevalidate.mockReset()
  mockRedirect.mockReset()
  mockCreateClient.mockReset()
})

describe('role gating (admin/manager only)', () => {
  it('member role is rejected across stock actions', async () => {
    const { supabase } = makeSupabase({})
    authAs(supabase, 'member')
    const { createCategory } = await import('@/app/dashboard/stock/categorias/actions')
    const { addMovement } = await import('@/app/dashboard/stock/movimentos/actions')
    const { updateQuoteStatus } = await import('@/app/dashboard/stock/pedidos/actions')

    expect((await createCategory(fd({ name: 'Som', sort_order: '1' }))).error).toBe(
      'Sem permissões de equipa'
    )
    expect(
      (await addMovement(fd({ material_id: UUID, type: 'saida', quantity: '1' }))).error
    ).toBe('Sem permissões de equipa')
    expect((await updateQuoteStatus(fd({ id: UUID, status: 'novo' }))).error).toBe(
      'Sem permissões de equipa'
    )
  })
})

describe('stock categorias', () => {
  it('creates category', async () => {
    const { supabase, inserts } = makeSupabase({ stock_categories: { error: null } })
    authAs(supabase)
    const { createCategory } = await import('@/app/dashboard/stock/categorias/actions')
    const result = await createCategory(fd({ name: 'Som', sort_order: '2' }))
    expect(result.error).toBeUndefined()
    expect((inserts['stock_categories'][0] as Record<string, unknown>).name).toBe('Som')
  })

  it('maps foreign key violation on delete to friendly message', async () => {
    const { supabase } = makeSupabase({ stock_categories: { error: { code: '23503' } } })
    authAs(supabase)
    const { deleteCategory } = await import('@/app/dashboard/stock/categorias/actions')
    const result = await deleteCategory(fd({ id: UUID }))
    expect(result.error).toBe('Categoria em uso')
  })
})

describe('stock eventos', () => {
  it('creates event', async () => {
    const { supabase, inserts } = makeSupabase({ stock_events: { error: null } })
    authAs(supabase)
    const { createEvent } = await import('@/app/dashboard/stock/eventos/actions')
    const result = await createEvent(fd({ name: 'Casamento', status: 'planeado' }))
    expect(result.error).toBeUndefined()
    expect(inserts['stock_events']).toHaveLength(1)
  })

  it('rejects invalid status transition payload', async () => {
    const { supabase } = makeSupabase({})
    authAs(supabase)
    const { updateEventStatus } = await import('@/app/dashboard/stock/eventos/actions')
    const result = await updateEventStatus(fd({ id: UUID, status: 'cancelado' }))
    expect(result.error).toContain('Estado inválido')
  })

  it('deletes event', async () => {
    const { supabase } = makeSupabase({ stock_events: { error: null } })
    authAs(supabase)
    const { deleteEvent } = await import('@/app/dashboard/stock/eventos/actions')
    const result = await deleteEvent(fd({ id: UUID }))
    expect(result.error).toBeUndefined()
  })
})

describe('stock movimentos', () => {
  it('blocks saida above available stock (pre-check)', async () => {
    const { supabase } = makeSupabase({
      stock_material_availability: { data: { disponivel: 2 }, error: null },
    })
    authAs(supabase)
    const { addMovement } = await import('@/app/dashboard/stock/movimentos/actions')
    const result = await addMovement(fd({ material_id: UUID, type: 'saida', quantity: '5' }))
    expect(result.error).toBe('Stock insuficiente (disponível: 2)')
  })

  it('inserts saida within stock with created_by', async () => {
    const { supabase, inserts } = makeSupabase({
      stock_material_availability: { data: { disponivel: 10 }, error: null },
      stock_movements: { error: null },
    })
    authAs(supabase)
    const { addMovement } = await import('@/app/dashboard/stock/movimentos/actions')
    const result = await addMovement(fd({ material_id: UUID, type: 'saida', quantity: '3' }))
    expect(result.error).toBeUndefined()
    expect((inserts['stock_movements'][0] as Record<string, unknown>).created_by).toBe('user-1')
  })

  it('maps db trigger error to friendly insufficient-stock message', async () => {
    const { supabase } = makeSupabase({
      stock_material_availability: { data: { disponivel: 5 }, error: null },
      stock_movements: { error: { message: 'stock insuficiente: disponivel 1' } },
    })
    authAs(supabase)
    const { addMovement } = await import('@/app/dashboard/stock/movimentos/actions')
    const result = await addMovement(fd({ material_id: UUID, type: 'saida', quantity: '4' }))
    expect(result.error).toBe('Stock insuficiente (disponível: 1)')
  })
})

describe('stock pedidos', () => {
  it('updates quote status', async () => {
    const { supabase, updates } = makeSupabase({ stock_quote_requests: { error: null } })
    authAs(supabase)
    const { updateQuoteStatus } = await import('@/app/dashboard/stock/pedidos/actions')
    const result = await updateQuoteStatus(fd({ id: UUID, status: 'respondido' }))
    expect(result.error).toBeUndefined()
    expect((updates['stock_quote_requests'][0] as Record<string, unknown>).status).toBe('respondido')
  })

  it('rejects unknown status', async () => {
    const { supabase } = makeSupabase({})
    authAs(supabase)
    const { updateQuoteStatus } = await import('@/app/dashboard/stock/pedidos/actions')
    const result = await updateQuoteStatus(fd({ id: UUID, status: 'xpto' }))
    expect(result.error).toContain('Estado inválido')
  })
})

describe('stock materiais', () => {
  const validForm = {
    name: 'Coluna',
    unit: 'un',
    quantity_total: '4',
    is_public: 'on',
    active: 'on',
  }

  it('creates material without photo and redirects', async () => {
    const { supabase, inserts } = makeSupabase({ stock_materials: { error: null } })
    authAs(supabase)
    const { createMaterial } = await import('@/app/dashboard/stock/materiais/actions')
    await createMaterial(fd(validForm))
    expect((inserts['stock_materials'][0] as Record<string, unknown>).photo_url).toBeNull()
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard/stock/materiais')
  })

  it('rejects photo that is not a supported raster (magic bytes)', async () => {
    const { supabase } = makeSupabase({ stock_materials: { error: null } })
    authAs(supabase)
    const { createMaterial } = await import('@/app/dashboard/stock/materiais/actions')
    const fake = new File([new TextEncoder().encode('<svg></svg>')], 'foto.png', {
      type: 'image/png',
    })
    const result = await createMaterial(fd({ ...validForm, photo: fake }))
    expect(result.error).toContain('JPEG, PNG, GIF ou WebP')
  })

  it('uploads real png photo and stores public url', async () => {
    const { supabase, inserts } = makeSupabase({ stock_materials: { error: null } })
    authAs(supabase)
    const { createMaterial } = await import('@/app/dashboard/stock/materiais/actions')
    const png = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0])],
      'foto.png',
      { type: 'image/png' }
    )
    await createMaterial(fd({ ...validForm, photo: png }))
    expect((inserts['stock_materials'][0] as Record<string, unknown>).photo_url).toBe(
      'https://cdn.example.com/foto.png'
    )
  })

  it('deactivateMaterial soft-deletes', async () => {
    const { supabase, updates } = makeSupabase({ stock_materials: { error: null } })
    authAs(supabase)
    const { deactivateMaterial } = await import('@/app/dashboard/stock/materiais/actions')
    const result = await deactivateMaterial(UUID)
    expect(result.error).toBeUndefined()
    expect((updates['stock_materials'][0] as Record<string, unknown>).active).toBe(false)
  })
})
