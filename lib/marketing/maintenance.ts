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

    // followup_count differs per row, so it can't collapse into one UPDATE -
    // but the sequential await-in-a-loop (update, then publish, one row at a
    // time) serialized N DB round-trips + N HTTP calls for no reason. Both
    // rounds are now fired concurrently.
    await Promise.all(
      eligibleSends.map(send =>
        supabase.from('marketing_sends').update({
          followup_count: send.followup_count + 1,
          last_followup_at: now.toISOString(),
        }).eq('id', send.id)
      )
    )

    await Promise.all(
      eligibleSends.map((send, i) =>
        qstash.publishJSON({
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
      )
    )

    dispatched += eligibleSends.length
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
      if (!bounces.length) continue

      // Batch the contact lookup once per sender instead of one SELECT per
      // bounce (real N+1: a mailbox with 50 bounces did 50 sequential
      // round-trips just to resolve email -> contact id).
      const bouncedEmails = [...new Set(bounces.map(b => b.bouncedEmail))]
      const { data: contacts } = await supabase
        .from('marketing_contacts')
        .select('id, email')
        .in('email', bouncedEmails)

      // email is only unique per list (UNIQUE(list_id, email)), so the same
      // address can map to multiple contact rows across different lists -
      // all of them should be marked bounced, not just one.
      const contactIdsByEmail = new Map<string, string[]>()
      for (const c of contacts ?? []) {
        contactIdsByEmail.set(c.email, (contactIdsByEmail.get(c.email) ?? []).concat(c.id))
      }

      const matched = bounces.flatMap(b => contactIdsByEmail.get(b.bouncedEmail) ?? [])

      await Promise.all(
        matched.flatMap(contactId => [
          supabase.from('marketing_sends')
            .update({ status: 'bounced' })
            .eq('contact_id', contactId)
            .eq('status', 'sent'),
          supabase.from('marketing_contacts')
            .update({ status: 'bounced' })
            .eq('id', contactId),
          supabase.rpc('marketing_increment_score', {
            p_contact_id: contactId,
            p_delta: SCORE_DELTA.bounced,
          }),
        ])
      )

      totalBounces += matched.length
    } catch (err) {
      console.error(`[bounce-poll] IMAP error for user ${userId}:`, err)
    }
  }

  return { processed: totalBounces }
}
