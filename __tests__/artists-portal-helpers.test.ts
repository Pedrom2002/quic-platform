import { describe, it, expect } from 'vitest'
import { isPortalActive, splitAgenda, splitAssets } from '@/lib/artists/portal-helpers'

const NOW = new Date('2026-07-16T12:00:00Z')

describe('isPortalActive', () => {
  it('active artist without expiry is active', () => {
    expect(isPortalActive({ is_active: true, portal_token_expires_at: null }, NOW)).toBe(true)
  })

  it('inactive artist is never active', () => {
    expect(isPortalActive({ is_active: false, portal_token_expires_at: null }, NOW)).toBe(false)
  })

  it('expired token is inactive', () => {
    expect(
      isPortalActive({ is_active: true, portal_token_expires_at: '2026-07-16T11:00:00Z' }, NOW)
    ).toBe(false)
  })

  it('future expiry is active', () => {
    expect(
      isPortalActive({ is_active: true, portal_token_expires_at: '2026-07-17T00:00:00Z' }, NOW)
    ).toBe(true)
  })
})

describe('splitAgenda', () => {
  it('splits and sorts upcoming asc, past desc', () => {
    const items = [
      { id: 'a', starts_at: '2026-07-20T21:00:00Z' },
      { id: 'b', starts_at: '2026-07-01T21:00:00Z' },
      { id: 'c', starts_at: '2026-07-18T21:00:00Z' },
      { id: 'd', starts_at: '2026-06-01T21:00:00Z' },
    ]
    const { upcoming, past } = splitAgenda(items, NOW)
    expect(upcoming.map((i) => i.id)).toEqual(['c', 'a'])
    expect(past.map((i) => i.id)).toEqual(['b', 'd'])
  })

  it('item starting exactly now counts as upcoming', () => {
    const { upcoming, past } = splitAgenda([{ starts_at: NOW.toISOString() }], NOW)
    expect(upcoming).toHaveLength(1)
    expect(past).toHaveLength(0)
  })

  it('handles empty input', () => {
    const { upcoming, past } = splitAgenda([], NOW)
    expect(upcoming).toEqual([])
    expect(past).toEqual([])
  })
})

describe('splitAssets', () => {
  it('splits by section', () => {
    const assets = [
      { id: '1', section: 'content' },
      { id: '2', section: 'document' },
      { id: '3', section: 'content' },
    ]
    const { contents, documents } = splitAssets(assets)
    expect(contents.map((a) => a.id)).toEqual(['1', '3'])
    expect(documents.map((a) => a.id)).toEqual(['2'])
  })
})
