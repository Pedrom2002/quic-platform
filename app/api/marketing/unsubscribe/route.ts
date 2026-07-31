import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SCORE_DELTA } from '@/lib/marketing/scoring'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'

const UNSUBSCRIBE_LIMIT = 5
const UNSUBSCRIBE_WINDOW_MS = 10 * 60 * 1_000

async function processUnsubscribe(sid: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data: send } = await supabase
    .from('marketing_sends')
    .select('id, contact_id')
    .eq('id', sid)
    .single()

  if (!send) return false

  await Promise.all([
    supabase.from('marketing_sends').update({ status: 'unsubscribed' }).eq('id', sid),
    supabase.from('marketing_contacts').update({ status: 'unsubscribed' }).eq('id', send.contact_id),
    supabase.rpc('marketing_increment_score', { p_contact_id: send.contact_id, p_delta: SCORE_DELTA.unsubscribed }),
  ])

  return true
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  if (await isRateLimited(`unsubscribe:${ip}`, UNSUBSCRIBE_LIMIT, UNSUBSCRIBE_WINDOW_MS)) {
    return NextResponse.json({ error: 'Demasiadas tentativas. Tenta novamente mais tarde.' }, { status: 429 })
  }

  const sid = request.nextUrl.searchParams.get('sid')
  if (!sid) return new NextResponse('Link inválido', { status: 400 })

  const ok = await processUnsubscribe(sid)
  if (!ok) return new NextResponse('Link inválido', { status: 404 })

  return new NextResponse(
    `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><title>Cancelado</title></head>
    <body style="font-family:sans-serif;text-align:center;padding:60px 20px">
      <h1 style="font-size:20px">Subscrição cancelada</h1>
      <p style="color:#666">Não receberá mais comunicações.</p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}

// RFC 8058 one-click unsubscribe (Gmail/Outlook 2024 requirement)
export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  if (await isRateLimited(`unsubscribe:${ip}`, UNSUBSCRIBE_LIMIT, UNSUBSCRIBE_WINDOW_MS)) {
    return NextResponse.json({ error: 'Demasiadas tentativas. Tenta novamente mais tarde.' }, { status: 429 })
  }

  const sid = request.nextUrl.searchParams.get('sid')
  if (!sid) return new NextResponse('Link inválido', { status: 400 })

  const ok = await processUnsubscribe(sid)
  if (!ok) return new NextResponse('Link inválido', { status: 404 })

  return new NextResponse('OK', { status: 200 })
}
