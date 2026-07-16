import { createAdminClient } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/logger'
import { isPortalActive, splitAgenda, splitAssets } from '@/lib/artists/portal-helpers'
import type { ArtistAgendaItem, ArtistClipping, ArtistAsset } from '@/types/database'

const log = createLogger('artists/portal-data')

export interface ArtistPortalData {
  artist: {
    id: string
    name: string
    photo_url: string | null
    bio: string | null
  }
  upcoming: ArtistAgendaItem[]
  past: ArtistAgendaItem[]
  clippings: ArtistClipping[]
  contents: ArtistAsset[]
  documents: ArtistAsset[]
}

export async function getArtistPortalData(token: string): Promise<ArtistPortalData | null> {
  if (!token) return null

  const supabase = createAdminClient()

  // Lookup pelo valor do portal_token guardado na BD (mesmo padrão de lib/portal/data.ts)
  const { data: artist } = await supabase
    .from('artists')
    .select('id, name, photo_url, bio, is_active, portal_token_expires_at')
    .eq('portal_token', token)
    .single()

  if (!artist) return null
  if (!isPortalActive(artist)) return null

  const [agendaRes, clippingsRes, assetsRes] = await Promise.all([
    supabase
      .from('artist_agenda_items')
      .select('*')
      .eq('artist_id', artist.id)
      .eq('is_visible', true),
    supabase
      .from('artist_clippings')
      .select('*')
      .eq('artist_id', artist.id)
      .order('published_at', { ascending: false, nullsFirst: false }),
    supabase
      .from('artist_assets')
      .select('*')
      .eq('artist_id', artist.id)
      .order('created_at', { ascending: false }),
  ])

  if (agendaRes.error) log.error('agenda query failed', { error: agendaRes.error.message })
  if (clippingsRes.error) log.error('clippings query failed', { error: clippingsRes.error.message })
  if (assetsRes.error) log.error('assets query failed', { error: assetsRes.error.message })

  const { upcoming, past } = splitAgenda(agendaRes.data ?? [])
  const { contents, documents } = splitAssets(assetsRes.data ?? [])

  return {
    artist: {
      id: artist.id,
      name: artist.name,
      photo_url: artist.photo_url,
      bio: artist.bio,
    },
    upcoming,
    past,
    clippings: clippingsRes.data ?? [],
    contents,
    documents,
  }
}
