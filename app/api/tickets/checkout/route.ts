// app/api/tickets/checkout/route.ts
import Stripe from 'stripe'
import * as z from 'zod'

import { createClient } from '@/lib/supabase/server'
import { getEnv } from '@/lib/env'

const bodySchema = z.object({
  ticketTypeId: z.uuid(),
  quantity: z.number().int().min(1).max(10),
})

export async function POST(request: Request) {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return Response.json({ error: 'Pedido inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: 'Pedido inválido' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: ticketType, error: ticketTypeError } = await supabase
    .from('ticket_types')
    .select('id, name, price_cents, currency')
    .eq('id', parsed.data.ticketTypeId)
    .eq('is_active', true)
    .single()

  if (ticketTypeError && ticketTypeError.code !== 'PGRST116') {
    console.error('[tickets checkout POST]', ticketTypeError.message)
    return Response.json({ error: 'Erro ao procurar tipo de bilhete' }, { status: 500 })
  }

  if (!ticketType) {
    return Response.json({ error: 'Tipo de bilhete não encontrado' }, { status: 404 })
  }

  const { STRIPE_SECRET_KEY, NEXT_PUBLIC_APP_URL } = getEnv()
  const stripe = new Stripe(STRIPE_SECRET_KEY)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: ticketType.currency,
          product_data: { name: ticketType.name },
          unit_amount: ticketType.price_cents,
        },
        quantity: parsed.data.quantity,
      },
    ],
    metadata: {
      ticket_type_id: ticketType.id,
      buyer_auth_user_id: userData.user.id,
      quantity: String(parsed.data.quantity),
    },
    success_url: `${NEXT_PUBLIC_APP_URL}/api/tickets/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: 'quicapp://tickets/cancel',
  })

  if (!session.url) {
    return Response.json({ error: 'Erro ao criar sessão de pagamento' }, { status: 502 })
  }

  return Response.json({ url: session.url })
}
