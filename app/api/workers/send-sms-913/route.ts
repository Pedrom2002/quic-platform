import { NextResponse } from 'next/server'
import { sendSms } from '@/lib/notifications/channels/sms'

export async function GET() {
  try {
    await sendSms({
      to: '+351913915944',
      message: 'Santos à Campolide: 9 novas menções na imprensa. Consulte todos os artigos no portal > separador Imprensa: https://app.quic.pt/portal/Lo3yqxkMzKMCpTIy',
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) })
  }
}
