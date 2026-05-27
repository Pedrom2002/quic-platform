import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertEventOwnership, resolveOrgMemberFull } from '@/lib/supabase/actions'
import { updateChecklistItemSchema } from '@/schemas/checklist.schema'
import { dispatchNotificationsForItem, dispatchStartNotificationForItem } from '@/lib/notifications/dispatcher'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string; itemId: string }> }
) {
  const { eventId, itemId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const member = await resolveOrgMemberFull(supabase, user.id)
  if (!member) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const body = await request.json()
  const parsed = updateChecklistItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const updates: Record<string, unknown> = { ...parsed.data }
  const isCompleting = parsed.data.status === 'completed'

  if (isCompleting) {
    updates.completed_at = new Date().toISOString()
    updates.completed_by = member.id
    const { data: current } = await supabase
      .from('event_checklist_items')
      .select('started_at')
      .eq('id', itemId)
      .single()
    if (!current?.started_at) {
      updates.started_at = new Date().toISOString()
    }
  }

  const isStarting = parsed.data.status === 'in_progress'

  if (isStarting) {
    updates.started_at = new Date().toISOString()
  }

  const { data: item, error } = await supabase
    .from('event_checklist_items')
    .update(updates)
    .eq('id', itemId)
    .eq('event_id', eventId)
    .select()
    .single()

  if (error) {
    console.error('[checklist PATCH]', error.message)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }

  if (isCompleting || isStarting) {
    const adminClient = createAdminClient()
    const { data: event } = await adminClient
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (event) {
      try {
        if (isCompleting) {
          await dispatchNotificationsForItem({ event, item, completedByName: member.full_name ?? 'Equipa QUIC' })
        } else {
          await dispatchStartNotificationForItem({ event, item })
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[dispatcher] falha:', msg)
      }
    }
  }

  return NextResponse.json({ item })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ eventId: string; itemId: string }> }
) {
  const { eventId, itemId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const member = await resolveOrgMemberFull(supabase, user.id)
  if (!member) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  const { error } = await supabase
    .from('event_checklist_items')
    .delete()
    .eq('id', itemId)
    .eq('event_id', eventId)

  if (error) {
    console.error('[checklist DELETE]', error.message)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
