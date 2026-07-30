import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SCORE_DELTA } from '@/lib/marketing/scoring'
import type { TablesUpdate } from '@/types/database'

const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
const PIXEL_HEADERS = {
  'Content-Type': 'image/gif',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
}

// Multi-pixel forensics: bot proxies pre-fetch top+bottom near-simultaneously.
// Real user opens top first, scrolls (or doesn't), bottom fires later or never.
const BOT_GAP_MS = 2000

export async function GET(request: NextRequest) {
  const sid = request.nextUrl.searchParams.get('sid')
  const pos = request.nextUrl.searchParams.get('pos') as 'top' | 'bottom' | null

  if (!sid) return new NextResponse(PIXEL, { headers: PIXEL_HEADERS })

  const supabase = createAdminClient()
  const { data: send } = await supabase
    .from('marketing_sends')
    .select('id, contact_id, status, pixel_top_at, pixel_bottom_at, bot_suspected')
    .eq('id', sid)
    .single()

  if (!send) return new NextResponse(PIXEL, { headers: PIXEL_HEADERS })

  const now = new Date()
  const update: TablesUpdate<'marketing_sends'> = {}
  if (pos === 'top' && !send.pixel_top_at) update.pixel_top_at = now.toISOString()
  if (pos === 'bottom' && !send.pixel_bottom_at) update.pixel_bottom_at = now.toISOString()
  if (!pos && !send.pixel_top_at) update.pixel_top_at = now.toISOString()

  if (Object.keys(update).length === 0) {
    return new NextResponse(PIXEL, { headers: PIXEL_HEADERS })
  }

  const topAt = update.pixel_top_at ?? send.pixel_top_at
  const bottomAt = update.pixel_bottom_at ?? send.pixel_bottom_at
  let botSuspected = send.bot_suspected
  if (topAt && bottomAt && !botSuspected) {
    const gap = new Date(bottomAt as string).getTime() - new Date(topAt as string).getTime()
    if (Math.abs(gap) < BOT_GAP_MS) {
      botSuspected = true
      update.bot_suspected = true
    }
  }

  const shouldCountOpen =
    send.status === 'sent' &&
    !botSuspected &&
    (pos === 'bottom' || (pos === 'top' && Boolean(send.pixel_bottom_at)))

  if (shouldCountOpen) {
    update.status = 'opened'
    update.opened_at = now.toISOString()
  }

  await supabase.from('marketing_sends').update(update).eq('id', sid)
  if (shouldCountOpen) {
    await supabase.rpc('marketing_increment_score', {
      p_contact_id: send.contact_id,
      p_delta: SCORE_DELTA.opened,
    })
  }

  return new NextResponse(PIXEL, { headers: PIXEL_HEADERS })
}
