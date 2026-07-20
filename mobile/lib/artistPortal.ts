// mobile/lib/artistPortal.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ArtistAgendaItem {
  id: string
  type: string
  title: string
  starts_at: string
  ends_at: string | null
  location: string | null
  notes: string | null
}

export interface ArtistClipping {
  id: string
  title: string
  source: string | null
  url: string
  published_at: string | null
}

export interface ArtistAsset {
  id: string
  section: string
  kind: string
  title: string
  blob_url: string | null
  external_url: string | null
  thumbnail_url: string | null
  created_at: string
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
    contents: assets.filter(a => a.section === 'content'),
    documents: assets.filter(a => a.section === 'document'),
  }
}

export interface ArtistPortalData {
  upcoming: ArtistAgendaItem[]
  past: ArtistAgendaItem[]
  clippings: ArtistClipping[]
  contents: ArtistAsset[]
  documents: ArtistAsset[]
}

export async function fetchArtistPortalData(
  supabase: SupabaseClient,
  artistId: string
): Promise<ArtistPortalData> {
  const [agendaRes, clippingsRes, assetsRes] = await Promise.all([
    supabase.from('artist_agenda_items').select('*').eq('artist_id', artistId).eq('is_visible', true),
    supabase
      .from('artist_clippings')
      .select('*')
      .eq('artist_id', artistId)
      .order('published_at', { ascending: false, nullsFirst: false }),
    supabase.from('artist_assets').select('*').eq('artist_id', artistId).order('created_at', { ascending: false }),
  ])

  const { upcoming, past } = splitAgenda((agendaRes.data ?? []) as ArtistAgendaItem[])
  const { contents, documents } = splitAssets((assetsRes.data ?? []) as ArtistAsset[])

  return {
    upcoming,
    past,
    clippings: (clippingsRes.data ?? []) as ArtistClipping[],
    contents,
    documents,
  }
}
