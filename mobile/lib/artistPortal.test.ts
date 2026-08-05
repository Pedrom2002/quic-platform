// mobile/lib/artistPortal.test.ts
import { describe, it, expect, jest } from '@jest/globals'
import { splitAgenda, splitAssets, fetchArtistPortalData } from './artistPortal'

describe('splitAgenda', () => {
  it('separates upcoming (asc) and past (desc)', () => {
    const now = new Date('2026-06-01T00:00:00Z')
    const items = [
      { id: 'a', starts_at: '2026-06-10T00:00:00Z' },
      { id: 'b', starts_at: '2026-05-01T00:00:00Z' },
      { id: 'c', starts_at: '2026-06-05T00:00:00Z' },
      { id: 'd', starts_at: '2026-04-01T00:00:00Z' },
    ]
    const { upcoming, past } = splitAgenda(items, now)
    expect(upcoming.map(i => i.id)).toEqual(['c', 'a'])
    expect(past.map(i => i.id)).toEqual(['b', 'd'])
  })
})

describe('splitAssets', () => {
  it('separates contents and documents by section', () => {
    const assets = [
      { id: '1', section: 'content' },
      { id: '2', section: 'document' },
      { id: '3', section: 'content' },
    ]
    const { contents, documents } = splitAssets(assets)
    expect(contents.map(a => a.id)).toEqual(['1', '3'])
    expect(documents.map(a => a.id)).toEqual(['2'])
  })
})

describe('fetchArtistPortalData', () => {
  function makeQuery(resolved: { data: unknown; error: unknown }) {
    const order = jest.fn<() => Promise<{ data: unknown; error: unknown }>>().mockResolvedValue(resolved)
    // eq2 resolves directly (agenda chain: select().eq().eq(), no terminal order())
    const eq2 = jest.fn<() => Promise<{ data: unknown; error: unknown }>>().mockResolvedValue(resolved)
    const eq1 = jest.fn(() => ({ eq: eq2, order }))
    const select = jest.fn(() => ({ eq: eq1 }))
    return { select, eq1, eq2, order }
  }

  it('fetches agenda, clippings and assets in parallel and splits them', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString()
    const agenda = makeQuery({
      data: [{ id: 'a1', starts_at: future, is_visible: true }],
      error: null,
    })
    const clippings = makeQuery({ data: [{ id: 'c1', published_at: '2026-01-01' }], error: null })
    const assets = makeQuery({ data: [{ id: 'as1', section: 'content' }], error: null })

    const from = jest.fn((table: string) => {
      if (table === 'artist_agenda_items') return agenda
      if (table === 'artist_clippings') return clippings
      if (table === 'artist_assets') return assets
      throw new Error(`unexpected table ${table}`)
    })
    const supabase = { from } as never

    const result = await fetchArtistPortalData(supabase, 'artist-1')

    expect(from).toHaveBeenCalledWith('artist_agenda_items')
    expect(from).toHaveBeenCalledWith('artist_clippings')
    expect(from).toHaveBeenCalledWith('artist_assets')
    expect(result.upcoming).toHaveLength(1)
    expect(result.clippings).toHaveLength(1)
    expect(result.contents).toHaveLength(1)
    expect(result.documents).toHaveLength(0)
  })

  it('returns empty arrays on error', async () => {
    const empty = makeQuery({ data: null, error: { message: 'boom' } })
    const from = jest.fn(() => empty)
    const supabase = { from } as never

    const result = await fetchArtistPortalData(supabase, 'artist-1')
    expect(result).toEqual({ upcoming: [], past: [], clippings: [], contents: [], documents: [] })
  })
})
