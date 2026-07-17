import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOrgAuth, mockRevalidate, mockPut, mockInviteUserByEmail } = vi.hoisted(() => ({
  mockRequireOrgAuth: vi.fn(),
  mockRevalidate: vi.fn(),
  mockPut: vi.fn(),
  mockInviteUserByEmail: vi.fn(),
}))

vi.mock('@/lib/supabase/actions', () => ({ requireOrgAuth: mockRequireOrgAuth }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidate }))
vi.mock('@vercel/blob', () => ({ put: mockPut }))
vi.mock('@/lib/env', () => ({
  getEnv: () => ({ BLOB_READ_WRITE_TOKEN: 'blob-token', NEXT_PUBLIC_APP_URL: 'https://app.quic.pt' }),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ auth: { admin: { inviteUserByEmail: mockInviteUserByEmail } } }),
}))

function makeSupabase() {
  const calls: Record<string, unknown[]> = { insert: [], update: [], eq: [] }
  const chain: {
    insert: (payload: unknown) => Promise<{ error: null }>
    update: (payload: unknown) => { eq: (col: string, val: unknown) => Promise<{ error: null }> }
    select?: (...args: unknown[]) => unknown
  } = {
    insert: vi.fn((payload: unknown) => {
      calls.insert.push(payload)
      return Promise.resolve({ error: null })
    }),
    update: vi.fn((payload: unknown) => {
      calls.update.push(payload)
      return {
        eq: vi.fn((col: string, val: unknown) => {
          calls.eq.push([col, val])
          return Promise.resolve({ error: null })
        }),
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

function authAs(supabase: unknown, role: string = 'member') {
  mockRequireOrgAuth.mockResolvedValue({
    supabase,
    user: { id: 'user-1' },
    member: { organization_id: 'org-1', role },
  })
}

beforeEach(() => {
  mockRequireOrgAuth.mockReset()
  mockRevalidate.mockReset()
  mockPut.mockReset()
})

describe('createArtist', () => {
  it('rejects unauthenticated', async () => {
    mockRequireOrgAuth.mockRejectedValue(new Error('Não autenticado'))
    const { createArtist } = await import('@/app/dashboard/artists/actions')
    const result = await createArtist(fd({ name: 'Maria' }))
    expect(result.error).toBe('Sem permissões')
  })

  it('rejects invalid form', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { createArtist } = await import('@/app/dashboard/artists/actions')
    const result = await createArtist(fd({ name: '  ' }))
    expect(result.error).toContain('Nome obrigatório')
  })

  it('inserts with organization_id and generated portal_token', async () => {
    const { supabase, calls } = makeSupabase()
    authAs(supabase)
    const { createArtist } = await import('@/app/dashboard/artists/actions')
    const result = await createArtist(fd({ name: 'Maria', email: 'maria@example.com' }))
    expect(result.error).toBeUndefined()
    const inserted = calls.insert[0] as Record<string, unknown>
    expect(inserted.organization_id).toBe('org-1')
    expect(inserted.portal_token).toMatch(/^[A-Za-z0-9_-]{16}$/)
    expect(mockRevalidate).toHaveBeenCalledWith('/dashboard/artists')
  })
})

describe('updateArtist', () => {
  it('rejects invalid id', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { updateArtist } = await import('@/app/dashboard/artists/actions')
    const result = await updateArtist(fd({ id: 'nope', name: 'Maria' }))
    expect(result.error).toBe('Artista inválido')
  })

  it('updates by id', async () => {
    const { supabase, calls } = makeSupabase()
    authAs(supabase)
    const { updateArtist } = await import('@/app/dashboard/artists/actions')
    const result = await updateArtist(fd({ id: UUID, name: 'Maria Nova' }))
    expect(result.error).toBeUndefined()
    expect(calls.eq[0]).toEqual(['id', UUID])
  })
})

describe('tokens', () => {
  it('regeneratePortalToken sets new token and clears expiry', async () => {
    const { supabase, calls } = makeSupabase()
    authAs(supabase)
    const { regeneratePortalToken } = await import('@/app/dashboard/artists/actions')
    const result = await regeneratePortalToken(fd({ id: UUID }))
    expect(result.error).toBeUndefined()
    const updated = calls.update[0] as Record<string, unknown>
    expect(updated.portal_token).toMatch(/^[A-Za-z0-9_-]{16}$/)
    expect(updated.portal_token_expires_at).toBeNull()
  })

  it('revokePortalToken sets expiry in the past/now', async () => {
    const { supabase, calls } = makeSupabase()
    authAs(supabase)
    const { revokePortalToken } = await import('@/app/dashboard/artists/actions')
    const result = await revokePortalToken(fd({ id: UUID }))
    expect(result.error).toBeUndefined()
    const updated = calls.update[0] as Record<string, unknown>
    expect(new Date(updated.portal_token_expires_at as string).getTime()).toBeLessThanOrEqual(
      Date.now()
    )
  })
})

describe('toggleArtistActive / reactivatePortalToken', () => {
  it('toggleArtistActive updates is_active from form value', async () => {
    const { supabase, calls } = makeSupabase()
    authAs(supabase)
    const { toggleArtistActive } = await import('@/app/dashboard/artists/actions')
    const result = await toggleArtistActive(fd({ id: UUID, is_active: 'false' }))
    expect(result.error).toBeUndefined()
    expect((calls.update[0] as Record<string, unknown>).is_active).toBe(false)
  })

  it('reactivatePortalToken clears expiry', async () => {
    const { supabase, calls } = makeSupabase()
    authAs(supabase)
    const { reactivatePortalToken } = await import('@/app/dashboard/artists/actions')
    const result = await reactivatePortalToken(fd({ id: UUID }))
    expect(result.error).toBeUndefined()
    expect((calls.update[0] as Record<string, unknown>).portal_token_expires_at).toBeNull()
  })

  it('toggleArtistActive rejects invalid id', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { toggleArtistActive } = await import('@/app/dashboard/artists/actions')
    const result = await toggleArtistActive(fd({ id: 'nope', is_active: 'true' }))
    expect(result.error).toBe('Artista inválido')
  })
})

describe('updateArtistPhoto', () => {
  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])

  it('rejects missing file', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { updateArtistPhoto } = await import('@/app/dashboard/artists/actions')
    const result = await updateArtistPhoto(fd({ id: UUID }))
    expect(result.error).toBe('Seleciona uma imagem')
  })

  it('rejects non-image content (magic bytes)', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase)
    const { updateArtistPhoto } = await import('@/app/dashboard/artists/actions')
    const fake = new File([new TextEncoder().encode('<svg>nope</svg>')], 'foto.png', {
      type: 'image/png',
    })
    const result = await updateArtistPhoto(fd({ id: UUID, photo: fake }))
    expect(result.error).toContain('Formato de imagem não suportado')
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('uploads real png and stores blob url', async () => {
    const { supabase, calls } = makeSupabase()
    authAs(supabase)
    mockPut.mockResolvedValue({ url: 'https://blob.vercel-storage.com/x.png' })
    const { updateArtistPhoto } = await import('@/app/dashboard/artists/actions')
    const photo = new File([pngBytes], 'foto.png', { type: 'image/png' })
    const result = await updateArtistPhoto(fd({ id: UUID, photo }))
    expect(result.error).toBeUndefined()
    expect(mockPut).toHaveBeenCalledOnce()
    const updated = calls.update[0] as Record<string, unknown>
    expect(updated.photo_url).toBe('https://blob.vercel-storage.com/x.png')
  })
})

describe('inviteArtistToApp', () => {
  it('rejects unauthenticated', async () => {
    mockRequireOrgAuth.mockRejectedValue(new Error('Não autenticado'))
    const { inviteArtistToApp } = await import('@/app/dashboard/artists/actions')
    const result = await inviteArtistToApp(fd({ id: UUID }))
    expect(result.error).toBe('Sem permissões')
  })

  it('rejects non-admin', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase, 'member')
    const { inviteArtistToApp } = await import('@/app/dashboard/artists/actions')
    const result = await inviteArtistToApp(fd({ id: UUID }))
    expect(result.error).toBe('Sem permissões')
  })

  it('rejects invalid id', async () => {
    const { supabase } = makeSupabase()
    authAs(supabase, 'admin')
    const { inviteArtistToApp } = await import('@/app/dashboard/artists/actions')
    const result = await inviteArtistToApp(fd({ id: 'nope' }))
    expect(result.error).toBe('Artista inválido')
  })

  it('rejects artist without email', async () => {
    const { supabase, chain } = makeSupabase()
    chain.select = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { id: UUID, email: null, auth_user_id: null }, error: null }),
      })),
    }))
    authAs(supabase, 'admin')
    const { inviteArtistToApp } = await import('@/app/dashboard/artists/actions')
    const result = await inviteArtistToApp(fd({ id: UUID }))
    expect(result.error).toBe('Artista sem email definido')
  })

  it('invites and links auth_user_id', async () => {
    const { supabase, chain, calls } = makeSupabase()
    chain.select = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: { id: UUID, email: 'maria@example.com', auth_user_id: null },
          error: null,
        }),
      })),
    }))
    mockInviteUserByEmail.mockResolvedValue({
      data: { user: { id: 'new-auth-user-id' } },
      error: null,
    })
    authAs(supabase, 'admin')
    const { inviteArtistToApp } = await import('@/app/dashboard/artists/actions')
    const result = await inviteArtistToApp(fd({ id: UUID }))
    expect(result.error).toBeUndefined()
    expect(mockInviteUserByEmail).toHaveBeenCalledWith('maria@example.com')
    const updated = calls.update[0] as Record<string, unknown>
    expect(updated.auth_user_id).toBe('new-auth-user-id')
  })

  it('rejects already-invited artist', async () => {
    const { supabase, chain } = makeSupabase()
    chain.select = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: { id: UUID, email: 'maria@example.com', auth_user_id: 'existing-id' },
          error: null,
        }),
      })),
    }))
    authAs(supabase, 'admin')
    const { inviteArtistToApp } = await import('@/app/dashboard/artists/actions')
    const result = await inviteArtistToApp(fd({ id: UUID }))
    expect(result.error).toBe('Artista já convidado')
  })
})
