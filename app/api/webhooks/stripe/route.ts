import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEnv } from '@/lib/env'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/webhooks/stripe')

export async function POST(request: Request) {
  const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = getEnv()
  const stripe = new Stripe(STRIPE_SECRET_KEY)

  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    log.error('assinatura invalida', { error: err instanceof Error ? err.message : String(err) })
    return Response.json({ error: 'Assinatura inválida' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return Response.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const ticketTypeId = session.metadata?.ticket_type_id
  const buyerAuthUserId = session.metadata?.buyer_auth_user_id
  const quantity = Number(session.metadata?.quantity ?? '0')

  if (!ticketTypeId || !buyerAuthUserId || quantity < 1) {
    log.error('metadata em falta no evento Stripe', { sessionId: session.id })
    return Response.json({ error: 'Metadata inválida' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('tickets')
    .select('id')
    .eq('stripe_checkout_session_id', session.id)
  if (existing && existing.length > 0) {
    return Response.json({ received: true, note: 'já processado' })
  }

  const { data: ticketType } = await supabase
    .from('ticket_types')
    .select('event_id, organization_id, quantity_sold')
    .eq('id', ticketTypeId)
    .single()
  if (!ticketType) {
    log.error('ticket_type não encontrado', { ticketTypeId })
    return Response.json({ error: 'Tipo de bilhete não encontrado' }, { status: 404 })
  }

  const rows = Array.from({ length: quantity }, () => ({
    ticket_type_id: ticketTypeId,
    event_id: ticketType.event_id,
    organization_id: ticketType.organization_id,
    buyer_auth_user_id: buyerAuthUserId,
    stripe_checkout_session_id: session.id,
  }))

  const { error: insertError } = await supabase.from('tickets').insert(rows)
  if (insertError) {
    log.error('erro ao criar bilhetes', { error: insertError.message })
    return Response.json({ error: 'Erro ao criar bilhetes' }, { status: 500 })
  }

  await supabase
    .from('ticket_types')
    .update({ quantity_sold: ticketType.quantity_sold + quantity })
    .eq('id', ticketTypeId)

  return Response.json({ received: true })
}
