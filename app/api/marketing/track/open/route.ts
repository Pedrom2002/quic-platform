import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SCORE_DELTA } from '@/lib/marketing/scoring'

const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

export async function GET(request: NextRequest) {
  const sid = request.nextUrl.searchParams.get('sid')

  if (sid) {
    const supabase = createAdminClient()
    const { data: send } = await supabase
      .from('marketing_sends')
      .select('id, contact_id, status')
      .eq('id', sid)
      .single()

    if (send && send.status === 'sent') {
      await Promise.all([
        supabase.from('marketing_sends').update({
          status: 'opened',
          opened_at: new Date().toISOString(),
        }).eq('id', sid),
        supabase.rpc('marketing_increment_score', { p_contact_id: send.contact_id, p_delta: SCORE_DELTA.opened }),
      ])
    }
  }

  return new NextResponse(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  })
}
