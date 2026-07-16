import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}))

import { getArtistPortalData } from '@/lib/artists/portal-data'

interface ArtistRow {
  id: string
  name: string
  photo_url: string | null
  bio: string | null
  is_active: boolean
  portal_token_expires_at: string | null
}

function artistLookup(row: ArtistRow | null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: row, error: null }),
      }),
    }),
  }
}

function listQuery(rows: unknown[]) {
  // suporta .select().eq().eq() e .select().eq().order() encadeados, thenable no fim
  const result = { data: rows, error: null }
  const chain: Record<string, unknown> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.eq = vi.fn(self)
  chain.order = vi.fn(self)
  chain.then = (resolve: (v: typeof result) => void) => resolve(result)
  return chain
}

const activeArtist: ArtistRow = {
  id: 'artist-1',
  name: 'Maria',
  photo_url: null,
  bio: 'Cantora',
  is_active: true,
  portal_token_expires_at: null,
}

beforeEach(() => {
  mockFrom.mockReset()
})

describe('getArtistPortalData', () => {
  it('returns null for empty token', async () => {
    expect(await getArtistPortalData('')).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns null when artist not found', async () => {
    mockFrom.mockReturnValue(artistLookup(null))
    expect(await getArtistPortalData('tok')).toBeNull()
  })

  it('returns null when artist inactive', async () => {
    mockFrom.mockReturnValue(artistLookup({ ...activeArtist, is_active: false }))
    expect(await getArtistPortalData('tok')).toBeNull()
  })

  it('returns null when token expired', async () => {
    mockFrom.mockReturnValue(
      artistLookup({ ...activeArtist, portal_token_expires_at: '2020-01-01T00:00:00Z' })
    )
    expect(await getArtistPortalData('tok')).toBeNull()
  })

  it('returns portal data with split agenda and assets', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString()
    const past = new Date(Date.now() - 86_400_000).toISOString()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'artists') return artistLookup(activeArtist)
      if (table === 'artist_agenda_items')
        return listQuery([
          { id: 'a1', starts_at: future, section: undefined },
          { id: 'a2', starts_at: past },
        ])
      if (table === 'artist_clippings') return listQuery([{ id: 'c1' }])
      if (table === 'artist_assets')
        return listQuery([
          { id: 's1', section: 'content' },
          { id: 's2', section: 'document' },
        ])
      throw new Error(`tabela inesperada: ${table}`)
    })

    const data = await getArtistPortalData('tok')
    expect(data).not.toBeNull()
    expect(data!.artist.name).toBe('Maria')
    expect(data!.upcoming.map((i) => i.id)).toEqual(['a1'])
    expect(data!.past.map((i) => i.id)).toEqual(['a2'])
    expect(data!.clippings).toHaveLength(1)
    expect(data!.contents.map((a) => a.id)).toEqual(['s1'])
    expect(data!.documents.map((a) => a.id)).toEqual(['s2'])
  })
})
