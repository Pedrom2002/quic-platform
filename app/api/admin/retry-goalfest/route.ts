// ONE-SHOT: retry failed Goalfest sends. Delete after use.
import { NextResponse } from 'next/server'
import { Client } from '@upstash/qstash'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEnv } from '@/lib/env'

const CAMPAIGN_ID = '63d1d71d-5f13-4147-bd9d-c649102245f9'
const SENDER_USER_ID = '25503c38-17ed-44f5-8460-c8e5f9ec2f68'

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  const env = getEnv()
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!env.QSTASH_TOKEN) {
    return NextResponse.json({ error: 'QSTASH_TOKEN not set' }, { status: 500 })
  }

  const supabase = createAdminClient()

  const { data: failedSends } = await supabase
    .from('marketing_sends')
    .select('id, contact_id')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'failed')

  if (!failedSends?.length) {
    return NextResponse.json({ retried: 0 })
  }

  await supabase
    .from('marketing_sends')
    .update({ status: 'pending', error: null })
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('status', 'failed')

  const qstash = new Client({ token: env.QSTASH_TOKEN })
  const appUrl = env.NEXT_PUBLIC_APP_URL

  for (let i = 0; i < failedSends.length; i++) {
    const send = failedSends[i]!
    await qstash.publishJSON({
      url: `${appUrl}/api/marketing/send`,
      delay: i * 6,
      body: {
        send_id: send.id,
        campaign_id: CAMPAIGN_ID,
        contact_id: send.contact_id,
        sender_user_id: SENDER_USER_ID,
      },
    })
  }

  return NextResponse.json({ retried: failedSends.length })
}
