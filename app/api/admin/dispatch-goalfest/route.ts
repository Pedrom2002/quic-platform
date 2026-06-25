// ONE-SHOT: dispatch Goalfest 2026 media campaign. Delete after use.
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

  const { data: campaign } = await supabase
    .from('marketing_campaigns')
    .select('list_id, status')
    .eq('id', CAMPAIGN_ID)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  // Check if already dispatched
  const { count: existingSends } = await supabase
    .from('marketing_sends')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', CAMPAIGN_ID)

  if (existingSends && existingSends > 0) {
    return NextResponse.json({ error: `Already dispatched: ${existingSends} sends exist`, existingSends }, { status: 409 })
  }

  const { data: contacts } = await supabase
    .from('marketing_contacts')
    .select('id')
    .eq('list_id', campaign.list_id)
    .eq('status', 'active')

  if (!contacts?.length) {
    return NextResponse.json({ error: 'No active contacts' }, { status: 400 })
  }

  const sendRows = contacts.map(c => ({
    campaign_id: CAMPAIGN_ID,
    contact_id: c.id,
    status: 'pending' as const,
  }))

  const { data: sends, error: insertError } = await supabase
    .from('marketing_sends')
    .insert(sendRows)
    .select('id, contact_id')

  if (insertError || !sends?.length) {
    return NextResponse.json({ error: insertError?.message ?? 'Insert failed' }, { status: 500 })
  }

  const qstash = new Client({ token: env.QSTASH_TOKEN })
  const appUrl = env.NEXT_PUBLIC_APP_URL

  let published = 0
  for (let i = 0; i < sends.length; i++) {
    const send = sends[i]!
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
    published++
  }

  await supabase
    .from('marketing_campaigns')
    .update({ status: 'sent' })
    .eq('id', CAMPAIGN_ID)

  return NextResponse.json({ success: true, contacts: contacts.length, sends: sends.length, published })
}
