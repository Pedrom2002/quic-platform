import { timingSafeEqual } from 'node:crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SCORE_DELTA } from '@/lib/marketing/scoring'
import { signTrackedLink } from '@/lib/marketing/render'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'

const TRACK_CLICK_LIMIT = 30
const TRACK_CLICK_WINDOW_MS = 60 * 1_000

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  if (await isRateLimited(`track-click:${ip}`, TRACK_CLICK_LIMIT, TRACK_CLICK_WINDOW_MS)) {
    return new NextResponse('Too Many Requests', { status: 429 })
  }

  const sid = request.nextUrl.searchParams.get('sid')
  const url = request.nextUrl.searchParams.get('url')
  const sig = request.nextUrl.searchParams.get('sig')

  if (!url || (!url.startsWith('https://') && !url.startsWith('http://'))) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  // Anti open-redirect: só redirecionamos para URLs que o próprio sistema
  // assinou ao injetar o tracking. Sem assinatura válida (sid + url) → 400.
  if (!sid || !sig) {
    return new NextResponse('Bad Request', { status: 400 })
  }
  const expected = signTrackedLink(sid, url)
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  if (sid) {
    const supabase = createAdminClient()
    const { data: send } = await supabase
      .from('marketing_sends')
      .select('id, contact_id')
      .eq('id', sid)
      .single()

    if (send) {
      await Promise.all([
        supabase.from('marketing_sends').update({
          status: 'clicked',
          clicked_at: new Date().toISOString(),
        }).eq('id', sid),
        supabase.rpc('marketing_increment_score', { p_contact_id: send.contact_id, p_delta: SCORE_DELTA.clicked }),
      ])
    }
  }

  return NextResponse.redirect(url)
}
