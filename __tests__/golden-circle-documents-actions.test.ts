import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOrgAuth, mockRevalidate, mockPut, mockDetectMime } = vi.hoisted(() => ({
  mockRequireOrgAuth: vi.fn(),
  mockRevalidate: vi.fn(),
  mockPut: vi.fn(),
  mockDetectMime: vi.fn(),
}))

vi.mock('@/lib/supabase/actions', () => ({ requireOrgAuth: mockRequireOrgAuth }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidate }))
vi.mock('@vercel/blob', () => ({ put: mockPut }))
vi.mock('@/lib/env', () => ({ getEnv: () => ({ BLOB_READ_WRITE_TOKEN: 'blob-token' }) }))
vi.mock('@/schemas/file.schema', async () => {
  const actual = await vi.importActual<typeof import('@/schemas/file.schema')>('@/schemas/file.schema')
  return { ...actual, detectMimeFromMagic: mockDetectMime }
})

function makeSupabase() {
  const calls: Record<string, unknown[]> = { insert: [] }
  const chain = {
    insert: vi.fn((payload: unknown) => { calls.insert.push(payload); return Promise.resolve({ error: null }) }),
  }
  return { supabase: { from: vi.fn(() => chain) }, calls }
}

function fd(obj: Record<string, string | File>) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(obj)) formData.set(key, value)
  return formData
}

const INVESTOR_UUID = '6a1a1f7b-8a8b-5c2b-ab3b-2d3e4f5a6b7c'

function authAs(supabase: unknown) {
  mockRequireOrgAuth.mockResolvedValue({ supabase, user: { id: 'user-1' }, member: { organization_id: 'org-1', role: 'admin' } })
}

beforeEach(() => {
  mockRequireOrgAuth.mockReset()
  mockRevalidate.mockReset()
  mockPut.mockReset()
  mockDetectMime.mockReset()
})

describe('createDocument', () => {
  it('rejects missing file', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { createDocument } = await import('@/app/dashboard/golden-circle/documentos/actions')
    const result = await createDocument(fd({ title: 'Contrato', type: 'contract', investor_id: INVESTOR_UUID }))
    expect(result.error).toBe('Seleciona um ficheiro')
  })

  it('rejects when file content does not match a supported type', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    mockDetectMime.mockResolvedValue(null)
    const file = new File(['plain text'], 'doc.txt', { type: 'application/pdf' })
    const { createDocument } = await import('@/app/dashboard/golden-circle/documentos/actions')
    const result = await createDocument(fd({ title: 'Contrato', type: 'contract', investor_id: INVESTOR_UUID, file }))
    expect(result.error).toBe('Tipo de ficheiro não suportado')
  })

  it('uploads and inserts document linked to investor', async () => {
    const { supabase, calls } = makeSupabase()
    authAs(supabase)
    mockDetectMime.mockResolvedValue('application/pdf')
    mockPut.mockResolvedValue({ url: 'https://blob.example.com/doc.pdf' })
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'contrato.pdf', { type: 'application/pdf' })
    const { createDocument } = await import('@/app/dashboard/golden-circle/documentos/actions')
    const result = await createDocument(fd({ title: 'Contrato', type: 'contract', investor_id: INVESTOR_UUID, file }))
    expect(result.error).toBeUndefined()
    const inserted = calls.insert[0] as Record<string, unknown>
    expect(inserted.investor_id).toBe(INVESTOR_UUID)
    expect(inserted.file_url).toBe('https://blob.example.com/doc.pdf')
    expect(mockRevalidate).toHaveBeenCalledWith('/dashboard/golden-circle/documentos')
  })
})
