import { NextResponse } from 'next/server'
import { sendEmail, buildEmailHtml } from '@/lib/notifications/channels/email'
import { sendSms } from '@/lib/notifications/channels/sms'

const PORTAL_URL = 'https://app.quic.pt/portal/Lo3yqxkMzKMCpTIy'
const EVENT = 'Santos à Campolide'
const SUBJECT = `${EVENT} · Estruturas`

const clients = [
  { name: 'Pedro Marques', email: 'pedro.marques@quic.pt', phone: null },
  { name: 'Rui Sousa',     email: 'Rui.Sousa@jf-campolide.pt', phone: '+351912365979' },
  { name: 'Carlos Vieira', email: 'Carlos.vieira@quic.pt', phone: '+351967202514' },
  { name: 'Sadik',         email: 'sadik.cassam@jf-campolide.pt', phone: '+351919575690' },
]

function body(name: string) {
  return `Ola ${name},

Relativamente às Estruturas do evento ${EVENT}, todas as etapas estão concluídas:

✓ Camarim de apoio à produção
✓ Módulos de apoio logístico
✓ Conjunto WC
✓ Módulo WC adicional
✓ Material logístico de apoio - tenda 2x2m
✓ Palco 10x10m + régies cobertas 3x3m
✓ Painel de luz para a zona dos camarins
✓ Ligações elétricas para todas as estruturas, cablagem geral
✓ 16 piquetes com disponibilidade para manutenção 24 horas
✓ Photo Booth

${PORTAL_URL}`
}

const smsText = `${EVENT} · Estruturas: todas as etapas concluídas. Ver portal: ${PORTAL_URL}`

export async function GET() {
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
