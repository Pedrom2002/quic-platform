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
    subject: `${EVENT} · Sistema de Som`,
    sms: `${EVENT} · Sistema de Som: todas as etapas concluídas. Ver portal: ${PORTAL_URL}`,
    body: (name: string) => `Ola ${name},

Relativamente ao Sistema de Som do evento ${EVENT}, todas as etapas estão concluídas:

✓ Sistema line-array com 8 topos por lado e subgrave (1 por lado)
✓ 2 mesas de mistura de palco independentes por stage, até 8 monitores
✓ 2 side-fills por lado
✓ 8 canais in-ear, microfonia adequada e cablagem

${PORTAL_URL}`,
  },
  {
    subject: `${EVENT} · Sistema de Iluminação`,
    sms: `${EVENT} · Sistema de Iluminação: todas as etapas concluídas. Ver portal: ${PORTAL_URL}`,
    body: (name: string) => `Ola ${name},

Relativamente ao Sistema de Iluminação do evento ${EVENT}, todas as etapas estão concluídas:

✓ 8 projetores Spot One
✓ 8 Wash LED
✓ 4 Beam
✓ 6 Strobes
✓ 1 máquina de fumo/haze
✓ 4 blinders de 4 unidades
✓ 4 blinders de 2 unidades
✓ 2 varas de Par 56, mesa de controlo de iluminação e followspot

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
