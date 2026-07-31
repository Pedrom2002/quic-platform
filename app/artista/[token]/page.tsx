import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { displayArtistName } from '@/lib/artists/format'
import { getArtistPortalData } from '@/lib/artists/portal-data'

import { ArtistPortalClient } from './ArtistPortalClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const data = await getArtistPortalData(token)
  if (!data) return { title: 'Portal' }
  return {
    title: `${displayArtistName(data.artist.name)} · Portal`,
    robots: { index: false, follow: false },
  }
}

export default async function ArtistPortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await getArtistPortalData(token)
  if (!data) notFound()

  return <ArtistPortalClient data={data} token={token} />
}
