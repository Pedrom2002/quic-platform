// ONE-SHOT: create ActivoBank newsletter campaign (draft). Delete after use.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const OWNER_USER_ID = '25503c38-17ed-44f5-8460-c8e5f9ec2f68'
const ONE_SHOT_TOKEN = 'activobank-newsletter-2026'

const CONTACTS = [
  { email: 'jo_ferreira8@hotmail.com', name: null },
  { email: 'joana.sancho97@gmail.com', name: null },
  { email: 'ricardo_lousa@hotmail.com', name: null },
  { email: 'marisadovale17@gmail.com', name: null },
  { email: 'tiagosabino@nutrencia.pt', name: null },
  { email: 'sergio23torres@gmail.com', name: null },
  { email: 'thaynapereira.ig@gmail.com', name: null },
  { email: 'jorgearsenioruivo@outlook.com', name: null },
  { email: 'meireles.caa@gmail.com', name: null },
  { email: 'oliverlatouf@gmail.com', name: null },
  { email: 'moreira.helder@gmail.com', name: null },
  { email: 'fabregacgabriel@gmail.com', name: null },
  { email: 'rodrigo.a.pratas@gmail.com', name: null },
  { email: 'valeria.bretas@estadao.com', name: null },
  { email: 'raffasricci@gmail.com', name: null },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('token') !== ONE_SHOT_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Get org for this user
  const { data: member } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('user_id', OWNER_USER_ID)
    .single()

  if (!member) return NextResponse.json({ error: 'org not found' }, { status: 404 })
  const orgId = member.organization_id

  // Create list
  const { data: list, error: listErr } = await supabase
    .from('marketing_lists')
    .insert({
      name: 'GoalFest - ActivoBank Lounge Newsletter',
      created_by: OWNER_USER_ID,
      organization_id: orgId,
    })
    .select()
    .single()

  if (listErr || !list) {
    return NextResponse.json({ error: listErr?.message ?? 'list insert failed' }, { status: 500 })
  }

  // Insert contacts
  const rows = CONTACTS.map(c => ({
    list_id: list.id,
    email: c.email.toLowerCase().trim(),
    name: c.name,
    organization_id: orgId,
    status: 'active' as const,
  }))

  const { error: contactsErr } = await supabase
    .from('marketing_contacts')
    .insert(rows)

  if (contactsErr) {
    return NextResponse.json({ error: contactsErr.message }, { status: 500 })
  }

  // Create campaign as draft
  const { data: campaign, error: campErr } = await supabase
    .from('marketing_campaigns')
    .insert({
      name: 'GoalFest - Newsletter ActivoBank Lounge',
      list_id: list.id,
      created_by: OWNER_USER_ID,
      organization_id: orgId,
      subject_template: 'GoalFest 2026 — O ActivoBank Lounge foi assim',
      body_template: `<p>Olá {{nome}},</p>
<p>Obrigado por teres passado pelo ActivoBank Lounge no GoalFest 2026.</p>
<p>Foi uma experiência incrível e queremos partilhar contigo o que aconteceu.</p>`,
      status: 'draft',
      followup_enabled: false,
      ai_personalize: false,
    })
    .select()
    .single()

  if (campErr || !campaign) {
    return NextResponse.json({ error: campErr?.message ?? 'campaign insert failed' }, { status: 500 })
  }

  return NextResponse.json({
    list_id: list.id,
    campaign_id: campaign.id,
    contacts_inserted: rows.length,
    status: 'draft — ready to edit and send',
  })
}
