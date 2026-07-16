import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOrgAuth, mockRevalidate, mockPut, mockNotify } = vi.hoisted(() => ({
  mockRequireOrgAuth: vi.fn(),
  mockRevalidate: vi.fn(),
  mockPut: vi.fn(),
  mockNotify: vi.fn(),
}))

vi.mock('@/lib/supabase/actions', () => ({ requireOrgAuth: mockRequireOrgAuth }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidate }))
vi.mock('@vercel/blob', () => ({ put: mockPut }))
vi.mock('@/lib/artists/notify', () => ({ notifyArtistOfNewItem: mockNotify }))
vi.mock('@/lib/env', () => ({
  getEnv: () => ({ BLOB_READ_WRITE_TOKEN: 'blob-token', NEXT_PUBLIC_APP_URL: 'https://app.quic.pt' }),
}))

const ARTIST_ID = '5f0f0e6a-7f7a-4b1a-9a2a-1c2d3e4f5a6b'

const ownedArtist = {
  id: ARTIST_ID,
  name: 'Maria',
  email: 'maria@example.com',
  portal_token: 'tok1234567890abc',
  notify_on_publish: true,
}

function makeSupabase(artistRow: typeof ownedArtist | null) {
  const inserts: Record<string, unknown[]> = {}
  const from = vi.fn((table: string) => {
    if (table === 'artists') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: artistRow, error: null }),
          }),
        }),
      }
    }
    return {
      insert: vi.fn((payload: unknown) => {
        inserts[table] = inserts[table] ?? []
        inserts[table].push(payload)
        return Promise.resolve({ error: null })
      }),
    }
  })
  return { supabase: { from }, inserts }
}

function authAs(supabase: unknown) {
  mockRequireOrgAuth.mockResolvedValue({
    supabase,
    user: { id: 'user-1' },
    member: { organization_id: 'org-1', role: 'member' },
  })
}

function fd(obj: Record<string, string | File>) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(obj)) formData.set(key, value)
  return formData
}

beforeEach(() => {
  mockRequireOrgAuth.mockReset()
  mockRevalidate.mockReset()
  mockPut.mockReset()
  mockNotify.mockReset()
})

describe('createAgendaItem', () => {
  const validForm = {
    artist_id: ARTIST_ID,
    type: 'show',
    title: 'Concerto',
    starts_at: '2026-08-01T21:00',
    is_visible: 'on',
  }

  it('rejects artist from another org (lookup returns null via RLS)', async () => {
    const { supabase } = makeSupabase(null)
    authAs(supabase)
    const { createAgendaItem } = await import('@/app/dashboard/artists/content-actions')
    const result = await createAgendaItem(fd(validForm))
    expect(result.error).toBe('Artista inválido')
  })

  it('inserts with artist_id and organization_id', async () => {
    const { supabase, inserts } = makeSupabase(ownedArtist)
    authAs(supabase)
    const { createAgendaItem } = await import('@/app/dashboard/artists/content-actions')
    const result = await createAgendaItem(fd(validForm))
    expect(result.error).toBeUndefined()
    const inserted = inserts['artist_agenda_items'][0] as Record<string, unknown>
    expect(inserted.artist_id).toBe(ARTIST_ID)
    expect(inserted.organization_id).toBe('org-1')
    expect(inserted.is_visible).toBe(true)
  })

  it('notifies artist when notify checkbox is on', async () => {
    const { supabase } = makeSupabase(ownedArtist)
    authAs(supabase)
    const { createAgendaItem } = await import('@/app/dashboard/artists/content-actions')
    await createAgendaItem(fd({ ...validForm, notify: 'on' }))
    expect(mockNotify).toHaveBeenCalledOnce()
    expect(mockNotify.mock.calls[0][0].itemLabel).toContain('Concerto')
  })

  it('does not notify without checkbox', async () => {
    const { supabase } = makeSupabase(ownedArtist)
    authAs(supabase)
    const { createAgendaItem } = await import('@/app/dashboard/artists/content-actions')
    await createAgendaItem(fd(validForm))
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('rejects invalid form', async () => {
    const { supabase } = makeSupabase(ownedArtist)
    authAs(supabase)
    const { createAgendaItem } = await import('@/app/dashboard/artists/content-actions')
    const result = await createAgendaItem(fd({ ...validForm, title: ' ' }))
    expect(result.error).toContain('Título obrigatório')
  })
})

describe('createClipping', () => {
  it('inserts clipping with url', async () => {
    const { supabase, inserts } = makeSupabase(ownedArtist)
    authAs(supabase)
    const { createClipping } = await import('@/app/dashboard/artists/content-actions')
    const result = await createClipping(
      fd({
        artist_id: ARTIST_ID,
        title: 'Entrevista',
        url: 'https://blitz.pt/entrevista',
        source: 'Blitz',
      })
    )
    expect(result.error).toBeUndefined()
    const inserted = inserts['artist_clippings'][0] as Record<string, unknown>
    expect(inserted.url).toBe('https://blitz.pt/entrevista')
    expect(inserted.organization_id).toBe('org-1')
  })
})

describe('createAsset', () => {
  it('creates asset with external link', async () => {
    const { supabase, inserts } = makeSupabase(ownedArtist)
    authAs(supabase)
    const { createAsset } = await import('@/app/dashboard/artists/content-actions')
    const result = await createAsset(
      fd({
        artist_id: ARTIST_ID,
        section: 'content',
        kind: 'video',
        title: 'Aftermovie',
        external_url: 'https://youtube.com/watch?v=abc',
      })
    )
    expect(result.error).toBeUndefined()
    const inserted = inserts['artist_assets'][0] as Record<string, unknown>
    expect(inserted.external_url).toBe('https://youtube.com/watch?v=abc')
    expect(inserted.blob_url).toBeNull()
  })

  it('rejects file + external link at the same time', async () => {
    const { supabase } = makeSupabase(ownedArtist)
    authAs(supabase)
    const { createAsset } = await import('@/app/dashboard/artists/content-actions')
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], 'x.jpg', {
      type: 'image/jpeg',
    })
    const result = await createAsset(
      fd({
        artist_id: ARTIST_ID,
        section: 'content',
        kind: 'foto',
        title: 'X',
        external_url: 'https://drive.google.com/x',
        file,
      })
    )
    expect(result.error).toContain('não ambos')
  })

  it('uploads file, sets thumbnail for images, notifies with document label', async () => {
    const { supabase, inserts } = makeSupabase(ownedArtist)
    authAs(supabase)
    mockPut.mockResolvedValue({ url: 'https://blob.vercel-storage.com/rider.pdf' })
    const { createAsset } = await import('@/app/dashboard/artists/content-actions')
    const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], 'rider.pdf', {
      type: 'application/pdf',
    })
    const result = await createAsset(
      fd({
        artist_id: ARTIST_ID,
        section: 'document',
        kind: 'rider',
        title: 'Rider 2026',
        file: pdf,
        notify: 'on',
      })
    )
    expect(result.error).toBeUndefined()
    const inserted = inserts['artist_assets'][0] as Record<string, unknown>
    expect(inserted.blob_url).toBe('https://blob.vercel-storage.com/rider.pdf')
    expect(inserted.thumbnail_url).toBeNull()
    expect(mockNotify).toHaveBeenCalledOnce()
    expect(mockNotify.mock.calls[0][0].itemLabel).toContain('documento')
  })

  it('rejects mime mismatch (pdf declared, png content)', async () => {
    const { supabase } = makeSupabase(ownedArtist)
    authAs(supabase)
    const { createAsset } = await import('@/app/dashboard/artists/content-actions')
    const fake = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      'doc.pdf',
      { type: 'application/pdf' }
    )
    const result = await createAsset(
      fd({ artist_id: ARTIST_ID, section: 'document', kind: 'contrato', title: 'X', file: fake })
    )
    expect(result.error).toContain('não corresponde')
    expect(mockPut).not.toHaveBeenCalled()
  })
})
