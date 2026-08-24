import type { SupabaseClient } from '@supabase/supabase-js'

export interface TicketType {
  id: string
  name: string
  price_cents: number
  quantity_total: number
  quantity_sold: number
}

export interface MyTicket {
  id: string
  qr_code: string
  status: string
  event_id: string
  event_name: string | null
  event_start_datetime: string | null
}

export async function fetchTicketTypes(supabase: SupabaseClient, eventId: string): Promise<TicketType[]> {
  const { data, error } = await supabase
    .from('ticket_types')
    .select('id, name, price_cents, quantity_total, quantity_sold')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('price_cents')

  if (error || !data) return []
  return data as unknown as TicketType[]
}

export async function fetchMyTickets(supabase: SupabaseClient): Promise<MyTicket[]> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return []

  const { data, error } = await supabase
    .from('tickets')
    .select('id, qr_code, status, event_id, events(name, start_datetime)')
    .eq('buyer_auth_user_id', userData.user.id)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as unknown as Array<{
    id: string
    qr_code: string
    status: string
    event_id: string
    events: { name: string; start_datetime: string } | null
  }>).map(row => ({
    id: row.id,
    qr_code: row.qr_code,
    status: row.status,
    event_id: row.event_id,
    event_name: row.events?.name ?? null,
    event_start_datetime: row.events?.start_datetime ?? null,
  }))
}

export interface SessionTicketsResult {
  tickets: MyTicket[]
  // true quando a consulta falhou de verdade (auth/rede/RLS) — distinto de
  // "ainda sem bilhetes" (tickets: [], error: false), para quem chama poder
  // parar de tentar em vez de confundir falha com pagamento por processar.
  error: boolean
}

export async function fetchTicketsBySession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<SessionTicketsResult> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return { tickets: [], error: true }

  const { data, error } = await supabase
    .from('tickets')
    .select('id, qr_code, status, event_id')
    .eq('stripe_checkout_session_id', sessionId)

  if (error) return { tickets: [], error: true }
  return { tickets: (data ?? []) as unknown as MyTicket[], error: false }
}

export async function createCheckoutSession(
  appBaseUrl: string,
  ticketTypeId: string,
  quantity: number,
  accessToken: string
): Promise<string | null> {
  try {
    const response = await fetch(`${appBaseUrl}/api/tickets/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ ticketTypeId, quantity }),
    })
    if (!response.ok) return null
    const body = await response.json()
    return body.url ?? null
  } catch {
    return null
  }
}
