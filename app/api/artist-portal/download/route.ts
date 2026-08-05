import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPortalActive } from '@/lib/artists/portal-helpers'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'

const ALLOWED_SUFFIXES = [
  '.public.blob.vercel-storage.com',
  '.supabase.co',
  '.supabase.in',
]

const DOWNLOAD_LIMIT = 60
const DOWNLOAD_WINDOW_MS = 5 * 60 * 1_000

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  if (await isRateLimited(`artist-portal-download:${ip}`, DOWNLOAD_LIMIT, DOWNLOAD_WINDOW_MS)) {
    return new NextResponse('Too Many Requests', { status: 429 })
  }

  const { searchParams } = request.nextUrl
  const token = searchParams.get('token')
  const url = searchParams.get('url')
  const name = searchParams.get('name') ?? 'download'

  if (!token || !url) {
    return new NextResponse('Missing params', { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return new NextResponse('Invalid url', { status: 400 })
  }

  const allowed = ALLOWED_SUFFIXES.some(s => parsed.hostname.endsWith(s))
  if (!allowed) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const supabase = createAdminClient()

  // Token do portal tem de resolver para um artista ativo
  const { data: artist } = await supabase
    .from('artists')
    .select('id, is_active, portal_token_expires_at')
    .eq('portal_token', token)
    .single()
  if (!artist || !isPortalActive(artist)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Anti open-proxy: o URL tem de pertencer a um asset DESTE artista.
  const { data: asset } = await supabase
    .from('artist_assets')
    .select('id')
    .eq('artist_id', artist.id)
    .eq('blob_url', url)
    .limit(1)
    .maybeSingle()
  if (!asset) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  let upstream: Response
  try {
    upstream = await fetch(url, { cache: 'no-store' })
  } catch (err) {
    console.error('[artist-download] fetch error:', err)
    return new NextResponse('Fetch failed', { status: 502 })
  }

  if (!upstream.ok) {
    console.error('[artist-download] upstream status:', upstream.status, url)
    return new NextResponse(`Upstream ${upstream.status}`, { status: 502 })
  }

  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
  const safeName = name.replace(/"/g, '_')

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Cache-Control': 'private, max-age=0',
    },
  })
}
