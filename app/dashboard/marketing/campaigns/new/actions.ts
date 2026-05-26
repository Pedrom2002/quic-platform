'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Client } from '@upstash/qstash'
import { getEnv } from '@/lib/env'

export async function createCampaign(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const scheduleNow = formData.get('schedule_now') === 'true'
  const scheduledAt = formData.get('scheduled_at') as string | null

  const { data: campaign, error } = await supabase.from('marketing_campaigns').insert({
    name: formData.get('name') as string,
    list_id: formData.get('list_id') as string,
    created_by: user.id,
    subject_template: formData.get('subject_template') as string,
    body_template: formData.get('body_template') as string,
    ai_objective: (formData.get('ai_objective') as string) || null,
    ai_personalize: formData.get('ai_personalize') === 'true',
    status: scheduleNow ? 'sending' : 'scheduled',
    scheduled_at: scheduleNow ? null : (scheduledAt || null),
    followup_enabled: formData.get('followup_enabled') === 'true',
    followup_days: parseInt(formData.get('followup_days') as string || '3', 10),
    followup_subject: (formData.get('followup_subject') as string) || null,
    followup_body: (formData.get('followup_body') as string) || null,
  }).select().single()

  if (error || !campaign) throw new Error('Erro ao criar campanha')

  if (scheduleNow) {
    await dispatchCampaignSends(campaign.id, user.id)
  }

  redirect(`/dashboard/marketing/campaigns/${campaign.id}`)
}

async function dispatchCampaignSends(campaignId: string, senderUserId: string) {
  const adminSupabase = createAdminClient()
  const env = getEnv()
  if (!env.QSTASH_TOKEN) return

  const { data: campaign } = await adminSupabase
    .from('marketing_campaigns')
    .select('list_id')
    .eq('id', campaignId)
    .single()

  if (!campaign) return

  const { data: contacts } = await adminSupabase
    .from('marketing_contacts')
    .select('id')
    .eq('list_id', campaign.list_id)
    .eq('status', 'active')

  if (!contacts?.length) return

  const sendRows = contacts.map(c => ({
    campaign_id: campaignId,
    contact_id: c.id,
    status: 'pending' as const,
  }))

  const { data: sends } = await adminSupabase
    .from('marketing_sends')
    .insert(sendRows)
    .select('id, contact_id')

  if (!sends?.length) return

  const qstash = new Client({ token: env.QSTASH_TOKEN })
  const appUrl = env.NEXT_PUBLIC_APP_URL

  for (let i = 0; i < sends.length; i++) {
    const send = sends[i]
    await qstash.publishJSON({
      url: `${appUrl}/api/marketing/send`,
      delay: i * 6,
      body: {
        send_id: send.id,
        campaign_id: campaignId,
        contact_id: send.contact_id,
        sender_user_id: senderUserId,
      },
    })
  }

  await adminSupabase
    .from('marketing_campaigns')
    .update({ status: 'sent' })
    .eq('id', campaignId)
}
