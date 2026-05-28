import { NextResponse } from 'next/server'
import { sendEmail, buildEmailHtml } from '@/lib/notifications/channels/email'
import { sendSms } from '@/lib/notifications/channels/sms'

const PORTAL_URL = 'https://app.quic.pt/portal/Lo3yqxkMzKMCpTIy'
const CLIENT = { name: 'Sadik', email: 'sadik.cassam@jf-campolide.pt', phone: '+351919575690' }
const EVENT = 'Santos à Campolide'

const emails = [
  {
    subject: `${EVENT} · Estruturas`,
    body: `Ola ${CLIENT.name},

Relativamente às Estruturas do evento ${EVENT}, as seguintes etapas estão concluídas:

✓ Camarim de apoio à produção
✓ Módulos de apoio logístico
✓ Conjunto WC
✓ Módulo WC adicional
✓ Material logístico de apoio - tenda 2x2m
✓ Palco 10x10m + régies cobertas 3x3m

Mais atualizações serão partilhadas ainda hoje.

${PORTAL_URL}`,
  },
  {
    subject: `${EVENT} · Mapeamento do Evento`,
    body: `Ola ${CLIENT.name},

Relativamente ao Mapeamento do evento ${EVENT}:

✓ Elaboração do mapeamento do evento

Mais atualizações serão partilhadas ainda hoje.

${PORTAL_URL}`,
  },
  {
    subject: `${EVENT} · Segurança`,
    body: `Ola ${CLIENT.name},

Relativamente à Segurança do evento ${EVENT}:

✓ Segurança no recinto desde sexta-feira (22/05)

Mais atualizações serão partilhadas ainda hoje.

${PORTAL_URL}`,
  },
]

const smsMessages = [
  `${EVENT} · Estruturas: 6 etapas concluídas. Ver portal: ${PORTAL_URL}`,
  `${EVENT} · Mapeamento: elaboração do mapeamento concluída. Ver portal: ${PORTAL_URL}`,
  `${EVENT} · Segurança: segurança no recinto desde 22/05 concluída. Ver portal: ${PORTAL_URL}`,
]

export async function GET() {
  const results: unknown[] = []

  for (const em of emails) {
    try {
      const html = buildEmailHtml(em.body, EVENT)
      const id = await sendEmail({ to: CLIENT.email, toName: CLIENT.name, subject: em.subject, html })
      results.push({ type: 'email', subject: em.subject, ok: true, id })
    } catch (err) {
      results.push({ type: 'email', subject: em.subject, ok: false, error: String(err) })
    }
  }

  for (const msg of smsMessages) {
    try {
      await sendSms({ to: CLIENT.phone, message: msg })
      results.push({ type: 'sms', ok: true, preview: msg.slice(0, 60) })
    } catch (err) {
      results.push({ type: 'sms', ok: false, error: String(err) })
    }
  }

  return NextResponse.json({ results })
}
