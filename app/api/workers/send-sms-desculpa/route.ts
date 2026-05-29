import { NextResponse } from 'next/server'
import { sendSms } from '@/lib/notifications/channels/sms'

export async function GET() {
  return NextResponse.json({ ready: true })
}

export async function POST() {
  try {
    await sendSms({
      to: '+351939915944',
      message: 'Pedimos desculpa pelo envio duplicado da mensagem anterior. Foi um erro técnico da nossa parte. Equipa Quic',
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) })
  }
}
