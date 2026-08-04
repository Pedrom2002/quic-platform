import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_SUFFIXES = [
  '.public.blob.vercel-storage.com',
  '.supabase.co',
  '.supabase.in',
  '.unsplash.com',
]

export async function GET(request: NextRequest) {
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

  // Token do portal tem de resolver para um evento com portal ativo.
  const { data: event } = await supabase
    .from('events')
    .select('id, portal_token_expires_at')
    .eq('portal_token', token)
    .single()
  if (!event) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  const expiresAt = (event as Record<string, unknown>).portal_token_expires_at
  if (expiresAt && new Date(expiresAt as string) <= new Date()) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Anti open-proxy: o URL tem de pertencer a um ficheiro DESTE evento.
  // Sem o filtro por event_id, bastaria conhecer/adivinhar um blob_url
  // armazenado para outro evento/organização para o proxy o servir na mesma.
  const { data: file } = await supabase
    .from('event_files')
    .select('id')
    .eq('event_id', event.id)
    .eq('blob_url', url)
    .limit(1)
    .maybeSingle()

  // event_reports é uma tabela separada de event_files (relatórios técnicos
  // e de contrato do portal). Só verificamos aqui se não encontrámos o URL
  // em event_files, mantendo o mesmo padrão de scoping por event_id + token.
  let hasAccess = Boolean(file)
  if (!hasAccess) {
    const { data: report } = await supabase
      .from('event_reports')
      .select('id')
      .eq('event_id', event.id)
      .eq('blob_url', url)
      .limit(1)
      .maybeSingle()
    hasAccess = Boolean(report)
  }

  if (!hasAccess) {
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
