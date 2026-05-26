import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SCORE_DELTA } from '@/lib/marketing/scoring'

export async function GET(request: NextRequest) {
  const sid = request.nextUrl.searchParams.get('sid')
  const url = request.nextUrl.searchParams.get('url')

  if (!url || (!url.startsWith('https://') && !url.startsWith('http://'))) {
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
