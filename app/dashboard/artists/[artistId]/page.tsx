import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getEnv } from '@/lib/env'
import type { Artist } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { ArtistForm } from '../artist-form'
import { ArtistPhotoForm } from './artist-photo-form'
import { PortalLinkCard } from './portal-link-card'

export default async function ArtistProfilePage({
  params,
}: {
  params: Promise<{ artistId: string }>
}) {
  const { artistId } = await params

  const supabase = await createClient()
  const { data } = await supabase.from('artists').select('*').eq('id', artistId).single()
  if (!data) notFound()
  const artist = data as Artist

  const appUrl = (getEnv().NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
  const portalUrl = artist.portal_token ? `${appUrl}/artista/${artist.portal_token}` : null

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <ArtistForm artist={artist} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Foto</CardTitle>
          </CardHeader>
          <CardContent>
            <ArtistPhotoForm artist={artist} />
          </CardContent>
        </Card>

        <PortalLinkCard artist={artist} portalUrl={portalUrl} />
      </div>
    </div>
  )
}
