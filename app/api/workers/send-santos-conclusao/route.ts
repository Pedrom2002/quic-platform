import { NextResponse } from 'next/server'
import { sendEmail, buildEmailHtml } from '@/lib/notifications/channels/email'
import { sendSms } from '@/lib/notifications/channels/sms'

const EVENT = 'Santos à Campolide'
const SUBJECT = `${EVENT} 2026 · Conclusão do Evento`

const clients = [
  { name: 'Pedro Marques', email: 'pedro.marques@quic.pt', phone: null },
  { name: 'Rui Sousa',     email: 'Rui.Sousa@jf-campolide.pt', phone: '+351912365979' },
  { name: 'Carlos Vieira', email: 'Carlos.vieira@quic.pt', phone: '+351967202514' },
  { name: 'Sadik',         email: 'sadik.cassam@jf-campolide.pt', phone: '+351919575690' },
]

const smsText = `${EVENT} 2026 concluído. Estrutura desmontada. Foi um prazer fazer parte deste projeto. QUIC`

function body(name: string) {
  return `Ola ${name},

Informamos que o evento ${EVENT} 2026 foi concluído com sucesso e toda a estrutura foi desmontada.

Foi um prazer fazer parte deste projeto e contribuir para mais uma edição memorável dos Santos Populares em Campolide.

QUIC`
}

export async function GET() {
  return NextResponse.json({ ready: true })
}

export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  const secret = process.env.CRON_SECRET ?? ''
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: unknown[] = []

  for (const client of clients) {
    try {
      const html = buildEmailHtml(body(client.name), EVENT)
      const id = await sendEmail({ to: client.email, toName: client.name, subject: SUBJECT, html })
      results.push({ type: 'email', client: client.name, ok: true, id })
    } catch (err) {
      results.push({ type: 'email', client: client.name, ok: false, error: String(err) })
    }

    if (client.phone) {
      try {
        await sendSms({ to: client.phone, message: smsText })
        results.push({ type: 'sms', client: client.name, ok: true })
      } catch (err) {
        results.push({ type: 'sms', client: client.name, ok: false, error: String(err) })
      }
    }
  }

  return NextResponse.json({ ok: true, results })
}
