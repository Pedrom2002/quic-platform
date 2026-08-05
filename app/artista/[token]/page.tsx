import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'

import { displayArtistName } from '@/lib/artists/format'
import { getArtistPortalData } from '@/lib/artists/portal-data'
import { isRateLimited } from '@/lib/rate-limit'

import { ArtistPortalClient } from './ArtistPortalClient'

export const dynamic = 'force-dynamic'

const ARTIST_PORTAL_LIMIT = 20
const ARTIST_PORTAL_WINDOW_MS = 5 * 60 * 1_000

async function getRequestIp(): Promise<string> {
  const h = await headers()
  const vercelForwarded = h.get('x-vercel-forwarded-for')
  if (vercelForwarded) return vercelForwarded.split(',')[0].trim()
  const forwarded = h.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return h.get('x-real-ip') ?? 'unknown'
}

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

  const ip = await getRequestIp()
  if (await isRateLimited(`artist-portal:${ip}`, ARTIST_PORTAL_LIMIT, ARTIST_PORTAL_WINDOW_MS)) {
    notFound()
  }

  const data = await getArtistPortalData(token)
  if (!data) notFound()

  return <ArtistPortalClient data={data} token={token} />
}
