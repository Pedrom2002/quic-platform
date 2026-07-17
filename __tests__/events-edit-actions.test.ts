import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOrgAuth, mockPut } = vi.hoisted(() => ({
  mockRequireOrgAuth: vi.fn(),
  mockPut: vi.fn(),
}))

vi.mock('@/lib/supabase/actions', () => ({ requireOrgAuth: mockRequireOrgAuth }))
vi.mock('@vercel/blob', () => ({ put: mockPut }))
vi.mock('@/lib/env', () => ({
  getEnv: () => ({ BLOB_READ_WRITE_TOKEN: 'blob-token', NEXT_PUBLIC_APP_URL: 'https://app.quic.pt' }),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn() }))

function makeSupabase() {
  const calls: Record<string, unknown[]> = { update: [], eq: [] }
  const chain = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: UUID }, error: null }),
        })),
      })),
    })),
    update: vi.fn((payload: unknown) => {
      calls.update.push(payload)
      return {
        eq: vi.fn(() => ({
          eq: vi.fn(() => {
            calls.eq.push(payload)
            return Promise.resolve({ error: null })
          }),
        })),
      }
    }),
  }
  return { supabase: { from: vi.fn(() => chain) }, calls, chain }
}

function fd(obj: Record<string, string | File>) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(obj)) formData.set(key, value)
  return formData
}

const UUID = '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b'

function authAs(supabase: unknown) {
  mockRequireOrgAuth.mockResolvedValue({
    supabase,
    user: { id: 'user-1' },
    member: { organization_id: 'org-1', role: 'member' },
  })
}

beforeEach(() => {
  mockRequireOrgAuth.mockReset()
  mockPut.mockReset()
})

describe('updateEventCoverPhoto', () => {
  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])

  it('rejects unauthenticated', async () => {
    mockRequireOrgAuth.mockRejectedValue(new Error('Não autenticado'))
    const { updateEventCoverPhoto } = await import('@/app/dashboard/events/[eventId]/edit/actions')
    const result = await updateEventCoverPhoto(fd({ id: UUID }))
    expect(result.error).toBe('Sem permissões')
  })

  it('rejects missing file', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { updateEventCoverPhoto } = await import('@/app/dashboard/events/[eventId]/edit/actions')
    const result = await updateEventCoverPhoto(fd({ id: UUID }))
    expect(result.error).toBe('Seleciona uma imagem')
  })

  it('rejects non-image content (magic bytes)', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { updateEventCoverPhoto } = await import('@/app/dashboard/events/[eventId]/edit/actions')
    const fake = new File([new TextEncoder().encode('<svg>nope</svg>')], 'capa.png', {
      type: 'image/png',
    })
    const result = await updateEventCoverPhoto(fd({ id: UUID, photo: fake }))
    expect(result.error).toContain('Formato de imagem não suportado')
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('uploads real png and stores blob url', async () => {
    const { supabase, calls } = makeSupabase()
    authAs(supabase)
    mockPut.mockResolvedValue({ url: 'https://blob.vercel-storage.com/capa.png' })
    const { updateEventCoverPhoto } = await import('@/app/dashboard/events/[eventId]/edit/actions')
    const photo = new File([pngBytes], 'capa.png', { type: 'image/png' })
    const result = await updateEventCoverPhoto(fd({ id: UUID, photo }))
    expect(result.error).toBeUndefined()
    expect(mockPut).toHaveBeenCalledOnce()
    const updated = calls.update[0] as Record<string, unknown>
    expect(updated.cover_image_url).toBe('https://blob.vercel-storage.com/capa.png')
  })
})
