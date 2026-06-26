// ONE-SHOT: check Goalfest send statuses. Delete after use.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEnv } from '@/lib/env'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${getEnv().CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('marketing_sends')
    .select('status')
    .eq('campaign_id', '63d1d71d-5f13-4147-bd9d-c649102245f9')
  const counts: Record<string, number> = {}
  for (const s of data ?? []) counts[s.status] = (counts[s.status] ?? 0) + 1
  return NextResponse.json({ total: data?.length ?? 0, counts })
}
