import { type NextRequest, NextResponse } from 'next/server'

const ALLOWED_SUFFIXES = [
  '.public.blob.vercel-storage.com',
  '.supabase.co',
  '.supabase.in',
]

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const url = searchParams.get('url')
  const name = searchParams.get('name') ?? 'download'

  if (!url) {
    return new NextResponse('Missing url param', { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return new NextResponse('Invalid url', { status: 400 })
  }

  const allowed = ALLOWED_SUFFIXES.some(s => parsed.hostname.endsWith(s))
  if (!allowed) {
    console.error('[download] blocked host:', parsed.hostname)
    return new NextResponse('Forbidden', { status: 403 })
  }

  let upstream: Response
  try {
    upstream = await fetch(url, { cache: 'no-store' })
  } catch (err) {
    console.error('[download] fetch error:', err)
    return new NextResponse('Fetch failed', { status: 502 })
  }

  if (!upstream.ok) {
    console.error('[download] upstream status:', upstream.status, url)
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
