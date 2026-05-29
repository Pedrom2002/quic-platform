import { NextResponse } from 'next/server'
import { sendSms } from '@/lib/notifications/channels/sms'

export async function GET() {
  return NextResponse.json({ ready: true })
}

export async function POST() {
  try {
    await sendSms({
      to: '+351913915944',
      message: 'Pedimos desculpa, as mensagens anteriores foram enviadas por engano para este número. Por favor ignore. Equipa Quic',
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) })
  }
}
