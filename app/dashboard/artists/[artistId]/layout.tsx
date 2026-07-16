import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { Artist } from '@/types/database'
import { Badge } from '@/components/ui/badge'

import { ArtistTabs } from './artist-tabs'

export default async function ArtistLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ artistId: string }>
}) {
  const { artistId } = await params

  const supabase = await createClient()
  const { data } = await supabase.from('artists').select('*').eq('id', artistId).single()
  if (!data) notFound()
  const artist = data as Artist

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        {artist.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artist.photo_url}
            alt={artist.name}
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-lg font-semibold">
            {artist.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{artist.name}</h1>
            <Badge variant={artist.is_active ? 'default' : 'secondary'}>
              {artist.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          {artist.email && <p className="text-sm text-muted-foreground">{artist.email}</p>}
        </div>
      </div>

      <ArtistTabs artistId={artist.id} />

      {children}
    </div>
  )
}
