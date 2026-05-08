import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_HOST = '0q7kycaotkbutqsj.public.blob.vercel-storage.com'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const url = searchParams.get('url')
  const name = searchParams.get('name') ?? 'download'

  if (!url) {
    return new NextResponse('Missing url', { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return new NextResponse('Invalid url', { status: 400 })
  }

  if (parsed.hostname !== ALLOWED_HOST) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const upstream = await fetch(url)
  if (!upstream.ok) {
    return new NextResponse('Upstream error', { status: 502 })
  }

  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
  const safeName = name.replace(/[^\w.\-]/g, '_')

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
