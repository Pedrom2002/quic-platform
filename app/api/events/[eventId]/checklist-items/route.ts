import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createChecklistItemSchema } from '@/schemas/checklist.schema'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: member } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('organization_id', member.organization_id)
    .single()
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const body = await request.json()
  const parsed = createChecklistItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data: item, error } = await supabase
    .from('event_checklist_items')
    .insert({ ...parsed.data, event_id: eventId })
    .select()
    .single()

  if (error) {
    console.error('[checklist POST]', error.message)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }

  return NextResponse.json({ item }, { status: 201 })
}
