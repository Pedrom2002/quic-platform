// Funções puras do portal do artista (testáveis sem BD)

export interface PortalArtistRow {
  is_active: boolean
  portal_token_expires_at: string | null
}

export function isPortalActive(artist: PortalArtistRow, now: Date = new Date()): boolean {
  if (!artist.is_active) return false
  if (!artist.portal_token_expires_at) return true
  return new Date(artist.portal_token_expires_at) > now
}

export function splitAgenda<T extends { starts_at: string }>(
  items: T[],
  now: Date = new Date()
): { upcoming: T[]; past: T[] } {
  const upcoming: T[] = []
  const past: T[] = []
  for (const item of items) {
    if (new Date(item.starts_at) >= now) upcoming.push(item)
    else past.push(item)
  }
  upcoming.sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
  past.sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at))
  return { upcoming, past }
}

export function splitAssets<T extends { section: string }>(
  assets: T[]
): { contents: T[]; documents: T[] } {
  return {
    contents: assets.filter((a) => a.section === 'content'),
    documents: assets.filter((a) => a.section === 'document'),
  }
}
