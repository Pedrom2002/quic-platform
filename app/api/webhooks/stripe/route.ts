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

  // purchase_tickets faz idempotencia + verificacao de capacidade + insert dos
  // bilhetes + incremento de quantity_sold numa unica transacao (SECURITY DEFINER
  // com SELECT ... FOR UPDATE no ticket_type), evitando que compras concorrentes
  // insiram bilhetes alem da capacidade antes do incremento falhar tarde demais.
  const { data: result, error: rpcError } = await supabase.rpc('purchase_tickets', {
    p_ticket_type_id: ticketTypeId,
    p_quantity: quantity,
    p_buyer_auth_user_id: buyerAuthUserId,
    p_stripe_checkout_session_id: session.id,
  })
  if (rpcError) {
    log.error('erro ao processar compra de bilhetes', { error: rpcError.message, ticketTypeId })
    return Response.json({ error: 'Erro ao criar bilhetes' }, { status: 500 })
  }
  if (!result?.success) {
    log.error('compra de bilhetes rejeitada', { error: result?.error, ticketTypeId })
    return Response.json({ error: result?.error ?? 'Erro ao criar bilhetes' }, { status: 409 })
  }

  return Response.json({ received: true })
}
