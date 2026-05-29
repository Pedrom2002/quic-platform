import { createAdminClient } from '@/lib/supabase/admin'
import { Client } from '@upstash/qstash'
import { getEnv } from '@/lib/env'
import { pollBounces } from '@/lib/marketing/imap'
import { SCORE_DELTA } from '@/lib/marketing/scoring'

// Marketing maintenance tasks, extracted so they can run both standalone
// (their own routes, for manual/QStash triggering) and bundled in the single
// daily /api/cron/marketing-maintenance cron (Vercel Hobby allows ≤2 crons).

export async function runMarketingFollowup(): Promise<{ dispatched: number }> {
  const env = getEnv()
  const supabase = createAdminClient()
  const now = new Date()

  const { data: campaigns } = await supabase
    .from('marketing_campaigns')
    .select('id, created_by, followup_days, followup_subject, followup_body, followup_max')
    .eq('status', 'sent')
    .eq('followup_enabled', true)

  if (!campaigns?.length) return { dispatched: 0 }

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

  return { dispatched }
}

export async function runBouncePoll(): Promise<{ processed: number }> {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)

  const { data: activeSenders } = await supabase
    .from('marketing_campaigns')
    .select('created_by')
    .in('status', ['sending', 'sent'])

  if (!activeSenders?.length) return { processed: 0 }

  const uniqueSenderIds = [...new Set(activeSenders.map(r => r.created_by))]
  let totalBounces = 0

  for (const userId of uniqueSenderIds) {
    const { data: creds } = await supabase
      .from('team_smtp_credentials')
      .select('host, username, password_enc')
      .eq('user_id', userId)
      .single()

    if (!creds) continue

    try {
      const bounces = await pollBounces(creds, since)

      for (const bounce of bounces) {
        const { data: contact } = await supabase
          .from('marketing_contacts')
          .select('id')
          .eq('email', bounce.bouncedEmail)
          .maybeSingle()

        if (!contact) continue

        await Promise.all([
          supabase.from('marketing_sends')
            .update({ status: 'bounced' })
            .eq('contact_id', contact.id)
            .eq('status', 'sent'),
          supabase.from('marketing_contacts')
            .update({ status: 'bounced' })
            .eq('id', contact.id),
          supabase.rpc('marketing_increment_score', {
            p_contact_id: contact.id,
            p_delta: SCORE_DELTA.bounced,
          }),
        ])

        totalBounces++
      }
    } catch (err) {
      console.error(`[bounce-poll] IMAP error for user ${userId}:`, err)
    }
  }

  return { processed: totalBounces }
}
