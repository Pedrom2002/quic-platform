import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOrgAuth, mockGetOrgAuth, mockGetOrgAuthFull, mockPut, mockDel, mockAudit } =
  vi.hoisted(() => ({
    mockRequireOrgAuth: vi.fn(),
    mockGetOrgAuth: vi.fn(),
    mockGetOrgAuthFull: vi.fn(),
    mockPut: vi.fn(),
    mockDel: vi.fn(),
    mockAudit: vi.fn(),
  }))

vi.mock('@/lib/supabase/actions', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/supabase/actions')>()
  return {
    ...original,
    requireOrgAuth: mockRequireOrgAuth,
    getOrgAuth: mockGetOrgAuth,
    getOrgAuthFull: mockGetOrgAuthFull,
  }
})
vi.mock('@vercel/blob', () => ({ put: mockPut, del: mockDel }))
vi.mock('@/lib/audit', () => ({ audit: mockAudit }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

const EVENT = '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b'

function chain(result: unknown, calls?: { inserts?: unknown[]; updates?: unknown[] }) {
  const c: Record<string, unknown> = {}
  const self = () => c
  for (const m of ['select', 'eq', 'is', 'in', 'or', 'order', 'limit', 'returns', 'maybeSingle', 'single', 'delete']) {
    c[m] = vi.fn(self)
  }
  c.insert = vi.fn((payload: unknown) => {
    calls?.inserts?.push(payload)
    return c
  })
  c.update = vi.fn((payload: unknown) => {
    calls?.updates?.push(payload)
    return c
  })
  ;(c as { then?: unknown }).then = (resolve: (v: unknown) => void) => resolve(result)
  return c
}

function makeSupabase() {
  const from = vi.fn()
  return { supabase: { from }, from }
}

function authAs(supabase: unknown, role = 'admin') {
  const auth = {
    supabase,
    user: { id: 'user-1' },
    member: { id: 'tm-1', full_name: 'Ana', organization_id: 'org-1', role },
  }
  mockRequireOrgAuth.mockResolvedValue(auth)
  mockGetOrgAuth.mockResolvedValue(auth)
  mockGetOrgAuthFull.mockResolvedValue(auth)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('contact groups', () => {
  it('createGroupAction forces admin_only=false for non-admins', async () => {
    const inserts: unknown[] = []
    const { supabase, from } = makeSupabase()
    authAs(supabase, 'member')
    from.mockReturnValueOnce(chain({ data: { id: 'g1' }, error: null }, { inserts }))
    const { createGroupAction } = await import('@/app/dashboard/contacts/actions')
    await createGroupAction({ name: 'VIPs', admin_only: true })
    expect((inserts[0] as Record<string, unknown>).admin_only).toBe(false)
  })

  it('createGroupAction keeps admin_only for admins and trims name', async () => {
    const inserts: unknown[] = []
    const { supabase, from } = makeSupabase()
    authAs(supabase, 'admin')
    from.mockReturnValueOnce(chain({ data: { id: 'g1' }, error: null }, { inserts }))
    const { createGroupAction } = await import('@/app/dashboard/contacts/actions')
    await createGroupAction({ name: '  VIPs  ', admin_only: true })
    const inserted = inserts[0] as Record<string, unknown>
    expect(inserted.admin_only).toBe(true)
    expect(inserted.name).toBe('VIPs')
  })

  it('updateGroupAction requires admin', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase, 'member')
    const { updateGroupAction } = await import('@/app/dashboard/contacts/actions')
    await expect(updateGroupAction('g1', { name: 'X' })).rejects.toThrow('Sem permissão')
  })
})

describe('contacts', () => {
  it('createContactAction rejects empty name', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { createContactAction } = await import('@/app/dashboard/contacts/actions')
    await expect(createContactAction({ full_name: '  ' })).rejects.toThrow('Nome obrigatório')
  })

  it('createContactAction creates org-scoped contact and returns id', async () => {
    const inserts: unknown[] = []
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    from.mockReturnValueOnce(chain({ data: { id: 'c1' }, error: null }, { inserts }))
    const { createContactAction } = await import('@/app/dashboard/contacts/actions')
    const id = await createContactAction({ full_name: 'João Costa', email: 'j@example.com' })
    expect(id).toBe('c1')
    expect((inserts[0] as Record<string, unknown>).organization_id).toBe('org-1')
  })

  it('createContactAction blocks non-admin adding to admin_only group', async () => {
    const { supabase, from } = makeSupabase()
    authAs(supabase, 'member')
    from
      .mockReturnValueOnce(chain({ data: { id: 'c1' }, error: null })) // insert client
      .mockReturnValueOnce(chain({ data: [{ id: 'g1', admin_only: true }] })) // groups check
    const { createContactAction } = await import('@/app/dashboard/contacts/actions')
    await expect(
      createContactAction({ full_name: 'João', groupIds: ['g1'] })
    ).rejects.toThrow('Sem permissão para adicionar a grupo admin')
  })

  it('deactivateContactAction soft-deletes', async () => {
    const updates: unknown[] = []
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    from.mockReturnValueOnce(chain({ error: null }, { updates }))
    const { deactivateContactAction } = await import('@/app/dashboard/contacts/actions')
    await deactivateContactAction('c1')
    expect((updates[0] as Record<string, unknown>).is_active).toBe(false)
  })

  it('syncContactGroupsAction rejects contact from another org', async () => {
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    from.mockReturnValueOnce(chain({ data: null })) // contact check
    const { syncContactGroupsAction } = await import('@/app/dashboard/contacts/actions')
    await expect(syncContactGroupsAction('c1', [])).rejects.toThrow('Contacto não encontrado')
  })

  it('loadContactsPageAction maps groups from a batch join after the RPC page', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'c1',
          full_name: 'João',
          email: null,
          phone: null,
          company: null,
          notes: null,
          is_active: true,
          created_at: '2026-07-01T00:00:00Z',
        },
      ],
      error: null,
    })
    const from = vi.fn().mockReturnValue(
      chain({
        data: [
          { contact_id: 'c1', contact_groups: { id: 'g1', name: 'VIPs', color: null, admin_only: false } },
        ],
        error: null,
      })
    )
    authAs({ rpc, from }, 'admin')
    const { loadContactsPageAction } = await import('@/app/dashboard/contacts/actions')
    const page = await loadContactsPageAction()
    expect(page.contacts).toHaveLength(1)
    expect(page.contacts[0].groups.map((g) => g.name)).toEqual(['VIPs'])
    expect(page.nextCursor).toBeNull()
  })
})

describe('event files actions', () => {
  const png = new File(
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])],
    'foto.png',
    { type: 'image/png' }
  )

  it('uploadFileAction returns null when unauthenticated', async () => {
    mockGetOrgAuthFull.mockResolvedValue(null)
    const { uploadFileAction } = await import('@/app/dashboard/events/[eventId]/files/actions')
    const fd = new FormData()
    fd.set('file', png)
    expect(await uploadFileAction(EVENT, fd)).toBeNull()
  })

  it('uploadFileAction uploads valid file and inserts record', async () => {
    const inserts: unknown[] = []
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    mockPut.mockResolvedValue({ url: 'https://blob.vercel-storage.com/x.png', pathname: 'x.png' })
    from
      .mockReturnValueOnce(chain({ data: { id: EVENT } })) // event ownership
      .mockReturnValueOnce(chain({ data: { id: 'f1', file_name: 'foto.png' } }, { inserts })) // insert
    const { uploadFileAction } = await import('@/app/dashboard/events/[eventId]/files/actions')
    const fd = new FormData()
    fd.set('file', png)
    const result = await uploadFileAction(EVENT, fd)
    expect(result).toMatchObject({ id: 'f1' })
    expect(mockPut).toHaveBeenCalledOnce()
    expect((inserts[0] as Record<string, unknown>).organization_id).toBe('org-1')
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'file.uploaded' }))
  })

  it('uploadFileAction rejects spoofed mime (declared png, pdf content)', async () => {
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    from.mockReturnValueOnce(chain({ data: { id: EVENT } }))
    const { uploadFileAction } = await import('@/app/dashboard/events/[eventId]/files/actions')
    const fake = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], 'x.png', {
      type: 'image/png',
    })
    const fd = new FormData()
    fd.set('file', fake)
    expect(await uploadFileAction(EVENT, fd)).toBeNull()
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('deleteFileAction deletes record and blob', async () => {
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    from
      .mockReturnValueOnce(chain({ data: { blob_url: 'https://blob.vercel-storage.com/x.png' } }))
      .mockReturnValueOnce(chain({ error: null, count: 1 }))
    const { deleteFileAction } = await import('@/app/dashboard/events/[eventId]/files/actions')
    expect(await deleteFileAction(EVENT, 'f1')).toBe(true)
    expect(mockDel).toHaveBeenCalled()
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'file.deleted' }))
  })

  it('deleteFileAction false when file not found', async () => {
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    from.mockReturnValueOnce(chain({ data: null }))
    const { deleteFileAction } = await import('@/app/dashboard/events/[eventId]/files/actions')
    expect(await deleteFileAction(EVENT, 'f1')).toBe(false)
  })
})

describe('dashboard files listing', () => {
  it('returns [] when unauthenticated', async () => {
    mockGetOrgAuth.mockResolvedValue(null)
    const { loadAllFilesAction } = await import('@/app/dashboard/files/actions')
    expect(await loadAllFilesAction()).toEqual([])
  })

  it('returns files for the org', async () => {
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    from.mockReturnValueOnce(chain({ data: [{ id: 'f1' }] }))
    const { loadAllFilesAction } = await import('@/app/dashboard/files/actions')
    expect(await loadAllFilesAction()).toHaveLength(1)
  })
})
