import { NextResponse } from 'next/server'
import { getEnv } from '@/lib/env'
import { isValidCronAuth } from '@/lib/cron-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_RETRY_AGE_HOURS = 24
const QSTASH_RETRY_DELAY = 5 * 60 // 5 minutes

export async function POST(request: Request) {
  if (!isValidCronAuth(request.headers.get('authorization'), getEnv().CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const cutoff = new Date(Date.now() - MAX_RETRY_AGE_HOURS * 60 * 60 * 1000).toISOString()

  // Filter by campaign recency first, then cap the sends fetched to that
  // recent set — applying .limit(100) before this filter (as before) could
  // starve genuinely recent failures if the first 100 rows happened to be
  // older ones now outside the retry window.
  const { data: recentCampaigns } = await supabase
    .from('marketing_campaigns')
    .select('id')
    .gte('created_at', cutoff)

  const recentCampaignIds = (recentCampaigns ?? []).map(c => c.id)
  if (!recentCampaignIds.length) return NextResponse.json({ retried: 0 })

  const { data: failedSends } = await supabase
    .from('marketing_sends')
    .select('id, campaign_id, contact_id, error, marketing_campaigns(created_by, created_at)')
    .eq('status', 'failed')
    .in('campaign_id', recentCampaignIds)
    .limit(100)

  const recentFailed = failedSends ?? []

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
