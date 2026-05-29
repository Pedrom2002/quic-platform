import { NextResponse } from 'next/server'
import { sendEmail, buildEmailHtml } from '@/lib/notifications/channels/email'
import { sendSms } from '@/lib/notifications/channels/sms'

const PORTAL_URL = 'https://app.quic.pt/portal/Lo3yqxkMzKMCpTIy'
const EVENT = 'Santos à Campolide'

const clients = [
  { name: 'Pedro Marques', email: 'pedro.marques@quic.pt', phone: null },
  { name: 'Rui Sousa',     email: 'Rui.Sousa@jf-campolide.pt', phone: '+351912365979' },
  { name: 'Carlos Vieira', email: 'Carlos.vieira@quic.pt', phone: '+351967202514' },
  { name: 'Sadik',         email: 'sadik.cassam@jf-campolide.pt', phone: '+351919575690' },
]

const emails = [
  {
    subject: `${EVENT} · Artigos Decorativos`,
    sms: `${EVENT} · Artigos Decorativos: todas as etapas concluídas. Ver portal: ${PORTAL_URL}`,
    body: (name: string) => `Ola ${name},

Relativamente aos Artigos Decorativos do evento ${EVENT}, todas as etapas estão concluídas:

✓ 2 pórticos luminosos de entrada
✓ 14 mastros
✓ Gambiarras
✓ Festões
✓ Grinaldas de Luzes

${PORTAL_URL}`,
  },
  {
    subject: `${EVENT} · Plano de Marketing e Assessoria`,
    sms: `${EVENT} · Marketing e Assessoria: todas as etapas concluídas. Ver portal: ${PORTAL_URL}`,
    body: (name: string) => `Ola ${name},

Relativamente ao Plano de Marketing e Assessoria do evento ${EVENT}, todas as etapas estão concluídas:

✓ Seleção de meios
✓ Comunicação e Assessoria de Imprensa

${PORTAL_URL}`,
  },
]

export async function GET() {
  const results: unknown[] = []

  for (const em of emails) {
    for (const client of clients) {
      try {
        const html = buildEmailHtml(em.body(client.name), EVENT)
        const id = await sendEmail({ to: client.email, toName: client.name, subject: em.subject, html })
        results.push({ type: 'email', subject: em.subject, client: client.name, ok: true, id })
      } catch (err) {
        results.push({ type: 'email', subject: em.subject, client: client.name, ok: false, error: String(err) })
      }

      if (client.phone) {
        try {
          await sendSms({ to: client.phone, message: em.sms })
          results.push({ type: 'sms', subject: em.subject, client: client.name, ok: true })
        } catch (err) {
          results.push({ type: 'sms', subject: em.subject, client: client.name, ok: false, error: String(err) })
        }
      }
    }
  }

  return NextResponse.json({ results })
}
