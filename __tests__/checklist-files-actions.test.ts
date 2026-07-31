// __tests__/checklist-files-actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetOrgAuth, mockAssertOwnership, mockPut } = vi.hoisted(() => ({
  mockGetOrgAuth: vi.fn(),
  mockAssertOwnership: vi.fn(),
  mockPut: vi.fn(),
}))

vi.mock('@/lib/supabase/actions', () => ({
  getOrgAuth: mockGetOrgAuth,
  assertEventOwnership: mockAssertOwnership,
}))
vi.mock('@vercel/blob', () => ({ put: mockPut }))

const EVENT = '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b'
const MEMBER = { organization_id: 'org-1', role: 'member' }

function chain(result: unknown, calls?: { inserts?: unknown[] }) {
  const c: Record<string, unknown> = {}
  const self = () => c
  for (const m of ['select', 'eq', 'order', 'returns', 'single']) {
    c[m] = vi.fn(self)
  }
  c.insert = vi.fn((payload: unknown) => {
    calls?.inserts?.push(payload)
    return c
  })
  c.delete = vi.fn(() => c)
  ;(c as { then?: unknown }).then = (resolve: (v: unknown) => void) => resolve(result)
  return c
}

function makeSupabase() {
  const from = vi.fn()
  return { supabase: { from }, from }
}

function authAs(supabase: unknown) {
  const auth = { supabase, user: { id: 'user-1' }, member: MEMBER }
  mockGetOrgAuth.mockResolvedValue(auth)
  return auth
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAssertOwnership.mockResolvedValue(true)
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token'
})

describe('loadItemFilesAction', () => {
  it('returns [] when unauthenticated', async () => {
    mockGetOrgAuth.mockResolvedValue(null)
    const { loadItemFilesAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    expect(await loadItemFilesAction(EVENT, 'item-1')).toEqual([])
  })

  it('loads links scoped to org and item, newest first', async () => {
    const links = [{ id: 'l1' }, { id: 'l2' }]
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    const selectChain = chain({ data: links })
    from.mockReturnValueOnce(selectChain)
    const { loadItemFilesAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    const result = await loadItemFilesAction(EVENT, 'item-1')
    expect(result).toEqual(links)
    expect(selectChain.eq).toHaveBeenCalledWith('checklist_item_id', 'item-1')
    expect(selectChain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
    expect(selectChain.order).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('returns [] when data is null', async () => {
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    from.mockReturnValueOnce(chain({ data: null }))
    const { loadItemFilesAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    expect(await loadItemFilesAction(EVENT, 'item-1')).toEqual([])
  })
})

describe('loadEventFilesForLinkingAction', () => {
  it('returns [] when unauthenticated', async () => {
    mockGetOrgAuth.mockResolvedValue(null)
    const { loadEventFilesForLinkingAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    expect(await loadEventFilesForLinkingAction(EVENT)).toEqual([])
  })

  it('loads event files scoped to org and event', async () => {
    const files = [{ id: 'f1' }]
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    const selectChain = chain({ data: files })
    from.mockReturnValueOnce(selectChain)
    const { loadEventFilesForLinkingAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    const result = await loadEventFilesForLinkingAction(EVENT)
    expect(result).toEqual(files)
    expect(selectChain.eq).toHaveBeenCalledWith('event_id', EVENT)
    expect(selectChain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
  })
})

describe('linkFileToItemAction', () => {
  it('returns null when unauthenticated', async () => {
    mockGetOrgAuth.mockResolvedValue(null)
    const { linkFileToItemAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    expect(await linkFileToItemAction(EVENT, 'item-1', 'file-1')).toBeNull()
  })

  it('returns null when event is not owned by the org', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    mockAssertOwnership.mockResolvedValue(false)
    const { linkFileToItemAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    expect(await linkFileToItemAction(EVENT, 'item-1', 'file-1')).toBeNull()
  })

  it('inserts link scoped to org, resolves linked_by from team member', async () => {
    const inserts: unknown[] = []
    const link = { id: 'l1' }
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    from
      .mockReturnValueOnce(chain({ data: { id: 'tm-1' } })) // linkedByRow lookup
      .mockReturnValueOnce(chain({ data: link }, { inserts })) // insert
    const { linkFileToItemAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    const result = await linkFileToItemAction(EVENT, 'item-1', 'file-1')
    expect(result).toEqual(link)
    const inserted = inserts[0] as Record<string, unknown>
    expect(inserted.checklist_item_id).toBe('item-1')
    expect(inserted.event_file_id).toBe('file-1')
    expect(inserted.organization_id).toBe('org-1')
    expect(inserted.linked_by).toBe('tm-1')
  })

  it('falls back to null linked_by when member lookup misses', async () => {
    const inserts: unknown[] = []
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    from
      .mockReturnValueOnce(chain({ data: null }))
      .mockReturnValueOnce(chain({ data: { id: 'l1' } }, { inserts }))
    const { linkFileToItemAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    await linkFileToItemAction(EVENT, 'item-1', 'file-1')
    expect((inserts[0] as Record<string, unknown>).linked_by).toBeNull()
  })

  it('returns null when insert yields no data', async () => {
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    from
      .mockReturnValueOnce(chain({ data: { id: 'tm-1' } }))
      .mockReturnValueOnce(chain({ data: null }))
    const { linkFileToItemAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    expect(await linkFileToItemAction(EVENT, 'item-1', 'file-1')).toBeNull()
  })
})

describe('unlinkFileFromItemAction', () => {
  it('returns false when unauthenticated', async () => {
    mockGetOrgAuth.mockResolvedValue(null)
    const { unlinkFileFromItemAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    expect(await unlinkFileFromItemAction(EVENT, 'item-1', 'link-1')).toBe(false)
  })

  it('returns false when event is not owned by the org', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    mockAssertOwnership.mockResolvedValue(false)
    const { unlinkFileFromItemAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    expect(await unlinkFileFromItemAction(EVENT, 'item-1', 'link-1')).toBe(false)
  })

  it('deletes link scoped to item/org and returns true on success', async () => {
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    const deleteChain = chain({ error: null, count: 1 })
    from.mockReturnValueOnce(deleteChain)
    const { unlinkFileFromItemAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    expect(await unlinkFileFromItemAction(EVENT, 'item-1', 'link-1')).toBe(true)
    expect(deleteChain.delete).toHaveBeenCalledWith({ count: 'exact' })
    expect(deleteChain.eq).toHaveBeenCalledWith('id', 'link-1')
    expect(deleteChain.eq).toHaveBeenCalledWith('checklist_item_id', 'item-1')
    expect(deleteChain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
  })

  it('returns false when nothing was deleted', async () => {
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    from.mockReturnValueOnce(chain({ error: null, count: 0 }))
    const { unlinkFileFromItemAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    expect(await unlinkFileFromItemAction(EVENT, 'item-1', 'link-1')).toBe(false)
  })
})

describe('uploadFileToItemAction', () => {
  const png = new File(
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])],
    'foto.png',
    { type: 'image/png' }
  )

  it('returns null when unauthenticated', async () => {
    mockGetOrgAuth.mockResolvedValue(null)
    const { uploadFileToItemAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    const fd = new FormData()
    fd.set('file', png)
    expect(await uploadFileToItemAction(EVENT, 'item-1', fd)).toBeNull()
  })

  it('returns null when event is not owned by the org', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    mockAssertOwnership.mockResolvedValue(false)
    const { uploadFileToItemAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    const fd = new FormData()
    fd.set('file', png)
    expect(await uploadFileToItemAction(EVENT, 'item-1', fd)).toBeNull()
  })

  it('returns null when no file present in form data', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { uploadFileToItemAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    const fd = new FormData()
    expect(await uploadFileToItemAction(EVENT, 'item-1', fd)).toBeNull()
  })

  it('returns null when file is empty (size 0)', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { uploadFileToItemAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    const empty = new File([], 'empty.png', { type: 'image/png' })
    const fd = new FormData()
    fd.set('file', empty)
    expect(await uploadFileToItemAction(EVENT, 'item-1', fd)).toBeNull()
  })

  it('returns null when file exceeds MAX_FILE_SIZE', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { uploadFileToItemAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    const { MAX_FILE_SIZE } = await import('@/schemas/file.schema')
    const big = new File([new Uint8Array(1)], 'big.png', { type: 'image/png' })
    Object.defineProperty(big, 'size', { value: MAX_FILE_SIZE + 1 })
    const fd = new FormData()
    fd.set('file', big)
    expect(await uploadFileToItemAction(EVENT, 'item-1', fd)).toBeNull()
  })

  it('returns null when declared mime type is not allow-listed', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { uploadFileToItemAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    const exe = new File([new Uint8Array([0x4d, 0x5a])], 'evil.exe', {
      type: 'application/x-msdownload',
    })
    const fd = new FormData()
    fd.set('file', exe)
    expect(await uploadFileToItemAction(EVENT, 'item-1', fd)).toBeNull()
  })

  it('returns null on mime mismatch (declared png, actual pdf magic bytes)', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { uploadFileToItemAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    const fake = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], 'x.png', {
      type: 'image/png',
    })
    const fd = new FormData()
    fd.set('file', fake)
    expect(await uploadFileToItemAction(EVENT, 'item-1', fd)).toBeNull()
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('returns null when BLOB_READ_WRITE_TOKEN is not configured', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { uploadFileToItemAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    const fd = new FormData()
    fd.set('file', png)
    expect(await uploadFileToItemAction(EVENT, 'item-1', fd)).toBeNull()
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('uploads valid file, inserts event_files then checklist_item_files, scoped to org', async () => {
    const inserts: unknown[] = []
    const link = { id: 'l1' }
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    mockPut.mockResolvedValue({ url: 'https://blob.vercel-storage.com/foto.png', pathname: 'foto.png' })
    from
      .mockReturnValueOnce(chain({ data: { id: 'tm-1' } })) // memberRow lookup
      .mockReturnValueOnce(chain({ data: { id: 'ef-1' } }, { inserts })) // event_files insert
      .mockReturnValueOnce(chain({ data: link }, { inserts })) // checklist_item_files insert
    const { uploadFileToItemAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    const fd = new FormData()
    fd.set('file', png)
    const result = await uploadFileToItemAction(EVENT, 'item-1', fd)
    expect(result).toEqual(link)
    expect(mockPut).toHaveBeenCalledOnce()
    const eventFileInsert = inserts[0] as Record<string, unknown>
    expect(eventFileInsert.event_id).toBe(EVENT)
    expect(eventFileInsert.organization_id).toBe('org-1')
    expect(eventFileInsert.uploaded_by).toBe('tm-1')
    expect(eventFileInsert.file_name).toBe('foto.png')
    const linkInsert = inserts[1] as Record<string, unknown>
    expect(linkInsert.checklist_item_id).toBe('item-1')
    expect(linkInsert.event_file_id).toBe('ef-1')
    expect(linkInsert.organization_id).toBe('org-1')
    expect(linkInsert.linked_by).toBe('tm-1')
  })

  it('returns null when event_files insert yields no data', async () => {
    const { supabase, from } = makeSupabase()
    authAs(supabase)
    mockPut.mockResolvedValue({ url: 'https://blob.vercel-storage.com/foto.png', pathname: 'foto.png' })
    from
      .mockReturnValueOnce(chain({ data: { id: 'tm-1' } }))
      .mockReturnValueOnce(chain({ data: null })) // event_files insert fails
    const { uploadFileToItemAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions-files'
    )
    const fd = new FormData()
    fd.set('file', png)
    expect(await uploadFileToItemAction(EVENT, 'item-1', fd)).toBeNull()
  })
})
