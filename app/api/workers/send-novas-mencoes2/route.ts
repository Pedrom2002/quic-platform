import { NextResponse } from 'next/server'
import { sendEmail, buildEmailHtml } from '@/lib/notifications/channels/email'
import { sendSms } from '@/lib/notifications/channels/sms'

const PORTAL_URL = 'https://app.quic.pt/portal/Lo3yqxkMzKMCpTIy'
const EVENT = 'Santos à Campolide'
const SUBJECT = `${EVENT} · Novas menções na imprensa`

const clients = [
  { name: 'Pedro Marques', email: 'pedro.marques@quic.pt', phone: null },
  { name: 'Rui Sousa',     email: 'Rui.Sousa@jf-campolide.pt', phone: '+351912365979' },
  { name: 'Carlos Vieira', email: 'Carlos.vieira@quic.pt', phone: '+351967202514' },
  { name: 'Sadik',         email: 'sadik.cassam@jf-campolide.pt', phone: '+351919575690' },
]

const smsText = `${EVENT}: 4 novas menções na imprensa — Festas e Arraiais, Sapo, Flash.pt e Sábado. Ver todos no portal > separador Imprensa: ${PORTAL_URL}`

function body(name: string) {
  return `Ola ${name},

O evento ${EVENT} foi destaque em mais 4 publicações de imprensa:

  · Festas e Arraiais
  · Sapo
  · Flash.pt
  · Sábado

Para ler cada artigo, aceda ao portal do evento e clique no separador Imprensa.

${PORTAL_URL}`
}

export async function GET() {
  return NextResponse.json({ ready: true })
}

export async function POST() {
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

  return NextResponse.json({ results })
}
