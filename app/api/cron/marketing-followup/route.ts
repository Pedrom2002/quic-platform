import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Client } from '@upstash/qstash'
import { getEnv } from '@/lib/env'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const env = getEnv()
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()

  const { data: campaigns } = await supabase
    .from('marketing_campaigns')
    .select('id, created_by, followup_days, followup_subject, followup_body, followup_max')
    .eq('status', 'sent')
    .eq('followup_enabled', true)

  if (!campaigns?.length) return NextResponse.json({ dispatched: 0 })

  const qstash = env.QSTASH_TOKEN ? new Client({ token: env.QSTASH_TOKEN }) : null
  let dispatched = 0

  for (const campaign of campaigns) {
    const cutoff = new Date(now.getTime() - campaign.followup_days * 24 * 60 * 60 * 1000)

    const { data: eligibleSends } = await supabase
      .from('marketing_sends')
      .select('id, contact_id, followup_count')
      .eq('campaign_id', campaign.id)
      .eq('status', 'sent')
      .lt('sent_at', cutoff.toISOString())
      .lt('followup_count', campaign.followup_max)

    if (!eligibleSends?.length || !qstash) continue

    for (let i = 0; i < eligibleSends.length; i++) {
      const send = eligibleSends[i]

      await supabase.from('marketing_sends').update({
        followup_count: send.followup_count + 1,
        last_followup_at: now.toISOString(),
      }).eq('id', send.id)

      await qstash.publishJSON({
        url: `${env.NEXT_PUBLIC_APP_URL}/api/marketing/send`,
        delay: i * 6,
        body: {
          send_id: send.id,
          campaign_id: campaign.id,
          contact_id: send.contact_id,
          sender_user_id: campaign.created_by,
          is_followup: true,
          followup_subject: campaign.followup_subject,
          followup_body: campaign.followup_body,
        },
      })

      dispatched++
    }
  }

  return NextResponse.json({ dispatched })
}
