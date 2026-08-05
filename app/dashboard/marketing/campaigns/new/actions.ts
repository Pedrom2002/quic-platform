'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireOrgAuth } from '@/lib/supabase/actions'
import { Client } from '@upstash/qstash'
import { getEnv } from '@/lib/env'
import { createCampaignSchema } from '@/schemas/campaign.schema'

export async function createCampaign(formData: FormData) {
  const { supabase, user } = await requireOrgAuth()

  const parsed = createCampaignSchema.safeParse({
    list_id: formData.get('list_id'),
    name: formData.get('name'),
    subject_template: formData.get('subject_template'),
    body_template: formData.get('body_template'),
    ai_objective: formData.get('ai_objective') || undefined,
    ai_personalize: formData.get('ai_personalize') === 'true',
    schedule_now: formData.get('schedule_now') === 'true',
    scheduled_at: formData.get('scheduled_at') || undefined,
    followup_enabled: formData.get('followup_enabled') === 'true',
    followup_days: parseInt(formData.get('followup_days') as string || '3', 10),
    followup_subject: formData.get('followup_subject') || undefined,
    followup_body: formData.get('followup_body') || undefined,
  })
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Dados inválidos')
  const data = parsed.data

  // Ownership da lista: o dispatch usa o admin client (ignora RLS), por isso
  // confirmamos aqui — com o cliente RLS-scoped — que a lista pertence à org
  // do utilizador antes de criar/disparar a campanha.
  const { data: list } = await supabase
    .from('marketing_lists')
    .select('id, organization_id')
    .eq('id', data.list_id)
    .single()
  if (!list) throw new Error('Lista não encontrada')

  const { data: campaign, error } = await supabase.from('marketing_campaigns').insert({
    name: data.name,
    list_id: data.list_id,
    organization_id: list.organization_id,
    created_by: user.id,
    subject_template: data.subject_template,
    body_template: data.body_template,
    ai_objective: data.ai_objective ?? null,
    ai_personalize: data.ai_personalize,
    status: data.schedule_now ? 'sending' : 'scheduled',
    scheduled_at: data.schedule_now ? null : (data.scheduled_at || null),
    followup_enabled: data.followup_enabled,
    followup_days: data.followup_days,
    followup_subject: data.followup_subject ?? null,
    followup_body: data.followup_body ?? null,
  }).select().single()

  if (error || !campaign) throw new Error('Erro ao criar campanha')

  const scheduleNow = data.schedule_now

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
    .select('list_id, organization_id')
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
    organization_id: campaign.organization_id,
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
