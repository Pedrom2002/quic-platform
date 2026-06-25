import { NextResponse } from 'next/server'
import { getEnv } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_RETRY_AGE_HOURS = 24
const QSTASH_RETRY_DELAY = 5 * 60 // 5 minutes

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  const cronSecret = getEnv().CRON_SECRET
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: failedSends } = await supabase
    .from('marketing_sends')
    .select('id, campaign_id, contact_id, error, marketing_campaigns(created_by, created_at)')
    .eq('status', 'failed')
    .limit(100)

  const cutoff = new Date(Date.now() - MAX_RETRY_AGE_HOURS * 60 * 60 * 1000).toISOString()
  const recentFailed = (failedSends ?? []).filter(s => {
    const camp = s.marketing_campaigns as { created_at?: string } | null
    return camp?.created_at && camp.created_at >= cutoff
  })

  if (!recentFailed.length) return NextResponse.json({ retried: 0 })

  const env = getEnv()
  const qstashUrl = env.QSTASH_URL
  const qstashToken = env.QSTASH_TOKEN
  const appUrl = env.NEXT_PUBLIC_APP_URL

  if (!qstashUrl || !qstashToken) {
    return NextResponse.json({ error: 'QStash not configured' }, { status: 500 })
  }

  let retried = 0
  for (const s of recentFailed) {
    // Skip permanent failures
    if (s.error && /invalid|not found|550|unauthorized/i.test(s.error)) continue

    const sender = (s.marketing_campaigns as { created_by?: string } | null)?.created_by
    if (!sender) continue

    const payload = {
      send_id: s.id,
      campaign_id: s.campaign_id,
      contact_id: s.contact_id,
      sender_user_id: sender,
    }

    try {
      await fetch(`${qstashUrl}/v2/publish/${appUrl}/api/marketing/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${qstashToken}`,
          'Content-Type': 'application/json',
          'Upstash-Delay': `${QSTASH_RETRY_DELAY}s`,
        },
        body: JSON.stringify(payload),
      })
      await supabase.from('marketing_sends')
        .update({ status: 'pending', error: null })
        .eq('id', s.id)
      retried++
    } catch (err) {
      console.error('[retry] failed to requeue:', s.id, err)
    }
  }

  return NextResponse.json({ retried })
}
