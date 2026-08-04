import { NextResponse } from 'next/server'
import { getPortalData } from '@/lib/portal/data'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'

const PORTAL_TOKEN_LIMIT = 20
const PORTAL_TOKEN_WINDOW_MS = 5 * 60 * 1_000

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip = getClientIp(request)
  if (await isRateLimited(`portal-token:${ip}`, PORTAL_TOKEN_LIMIT, PORTAL_TOKEN_WINDOW_MS)) {
    return NextResponse.json({ error: 'Demasiadas tentativas. Tenta novamente mais tarde.' }, { status: 429 })
  }

  const { token } = await params

  const data = await getPortalData(token)
  if (!data) {
    return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 401 })
  }

  return NextResponse.json({
    event: data.event,
    items: data.items,
    progress: data.progress,
    articles: data.articles,
    reports: data.reports,
    eventFiles: data.eventFiles,
  })
}
