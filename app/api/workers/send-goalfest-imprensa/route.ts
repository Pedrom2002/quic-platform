import { NextResponse } from 'next/server'
import { sendEmail, buildEmailHtml } from '@/lib/notifications/channels/email'
import { sendSms } from '@/lib/notifications/channels/sms'

const PORTAL_2026 = 'https://app.quic.pt/portal/7632bef0fa59ef075d6c8af1818d94e9524730f45e0d14b3906233c8fbe238bf'
const PORTAL_ACTIVO = 'https://app.quic.pt/portal/7632bef0fa59ef075d6c8af1818d94e9524730f45e0d14b3906233c8fbe238bf'
const SUBJECT = 'GoalFest · Destaque na imprensa'
const MEIOS = '  · Actigamer\n  · O Cidadão\n  · FluxMedia\n  · Facebook O Cidadão\n  · Jogada do Mês\n  · Echo Boomer'
const SMS_TEXT = `GoalFest em destaque em 6 meios: Actigamer, O Cidadão, FluxMedia e mais. Ver portal > Imprensa: ${PORTAL_2026}`

function body(name: string, eventRef: string, portalUrl: string) {
  return `Ola ${name},

${eventRef} foi destaque em 6 publicações de imprensa:

${MEIOS}

Para ler cada artigo, aceda ao portal do evento e clique no separador Imprensa.

${portalUrl}`
}

const clients2026 = [
  { name: 'Carlos Vieira', email: 'Carlos.vieira@quic.pt',       phone: '+351967202514', ref: 'o evento GoalFest' },
  { name: 'Bruno Santos',  email: 'Bruno.santos@jr-olivais.pt',  phone: '+351910242417', ref: 'o evento GoalFest' },
  { name: '3 Amigos',      email: null,                          phone: '+351964090369',  ref: 'o evento GoalFest onde vão estar presentes' },
  { name: 'Ibrahim',       email: 'smashhousept@gmail.com',      phone: '+351937861508',  ref: 'o evento GoalFest onde vão estar presentes' },
  { name: 'Krishna Hamal', email: 'krishna.hamal56@gmail.com',   phone: null,             ref: 'o evento GoalFest onde vão estar presentes' },
  { name: 'Nuno Silva',    email: 'atmosferajovial@gmail.com',   phone: '+351914450041',  ref: 'o evento GoalFest onde vão estar presentes' },
]

const clientsActivo = [
  { name: 'Carlos Vieira', email: 'Carlos.vieira@quic.pt',      phone: '+351967202514', ref: 'o evento GoalFest' },
  { name: 'Joao Pereira',  email: 'Joao.pereira@activobank.pt', phone: '+351911549303', ref: 'o evento GoalFest' },
]

export async function GET() {
  return NextResponse.json({ ready: true })
}

export async function POST() {
  const results: unknown[] = []

  for (const client of clients2026) {
    if (client.email) {
      try {
        const html = buildEmailHtml(body(client.name, client.ref, PORTAL_2026), 'GoalFest 2026')
        const id = await sendEmail({ to: client.email, toName: client.name, subject: SUBJECT, html })
        results.push({ event: 'goalfest2026', type: 'email', client: client.name, ok: true, id })
      } catch (err) {
        results.push({ event: 'goalfest2026', type: 'email', client: client.name, ok: false, error: String(err) })
      }
    }
    if (client.phone) {
      try {
        await sendSms({ to: client.phone, message: SMS_TEXT })
        results.push({ event: 'goalfest2026', type: 'sms', client: client.name, ok: true })
      } catch (err) {
        results.push({ event: 'goalfest2026', type: 'sms', client: client.name, ok: false, error: String(err) })
      }
    }
  }

  for (const client of clientsActivo) {
    if (client.email) {
      try {
        const html = buildEmailHtml(body(client.name, client.ref, PORTAL_ACTIVO), 'GoalFest – Activo Lounge')
        const id = await sendEmail({ to: client.email, toName: client.name, subject: SUBJECT, html })
        results.push({ event: 'activolounge', type: 'email', client: client.name, ok: true, id })
      } catch (err) {
        results.push({ event: 'activolounge', type: 'email', client: client.name, ok: false, error: String(err) })
      }
    }
    if (client.phone) {
      try {
        await sendSms({ to: client.phone, message: SMS_TEXT })
        results.push({ event: 'activolounge', type: 'sms', client: client.name, ok: true })
      } catch (err) {
        results.push({ event: 'activolounge', type: 'sms', client: client.name, ok: false, error: String(err) })
      }
    }
  }

  return NextResponse.json({ results })
}
