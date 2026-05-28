import { NextResponse } from 'next/server'
import { sendEmail, buildEmailHtml } from '@/lib/notifications/channels/email'
import { sendSms } from '@/lib/notifications/channels/sms'

const PORTAL_URL = 'https://app.quic.pt/portal/7632bef0fa59ef075d6c8af1818d94e9524730f45e0d14b3906233c8fbe238bf'
const EVENT = 'GoalFest – Activo Lounge'

const clients = [
  { name: 'Carlos Vieira', email: 'Carlos.vieira@quic.pt', phone: '+351967202514' },
  { name: 'Joao Pereira', email: 'Joao.pereira@activobank.pt', phone: '+351911549303' },
]

function welcomeBody(name: string) {
  return `Ola ${name},

Bem-vindo ao portal do evento ${EVENT}.

Aqui pode acompanhar em tempo real o progresso de todas as etapas do evento, consultar documentos e receber atualizações da nossa equipa.

${PORTAL_URL}`
}

function sorteiosBody(name: string) {
  return `Ola ${name},

Relativamente à APP Sorteios do evento ${EVENT}, as seguintes etapas estão concluídas:

✓ Definir mecânica do sorteio
✓ Aprovar plataforma
✓ Desenvolver APP de sorteios
✓ Testar APP em dispositivos reais

Mais atualizações serão partilhadas em breve.

${PORTAL_URL}`
}

const smsSorteios = `${EVENT} · APP Sorteios: 4 etapas concluídas. Ver portal: ${PORTAL_URL}`
const smsWelcome = `${EVENT}: bem-vindo ao portal do evento. Acompanhe o progresso em tempo real: ${PORTAL_URL}`

export async function GET() {
  const results: unknown[] = []

  for (const client of clients) {
    // Welcome email
    try {
      const html = buildEmailHtml(welcomeBody(client.name), EVENT)
      const id = await sendEmail({ to: client.email, toName: client.name, subject: `${EVENT} · Bem-vindo ao portal`, html })
      results.push({ type: 'email', subject: 'welcome', client: client.name, ok: true, id })
    } catch (err) {
      results.push({ type: 'email', subject: 'welcome', client: client.name, ok: false, error: String(err) })
    }

    // Welcome SMS
    try {
      await sendSms({ to: client.phone, message: smsWelcome })
      results.push({ type: 'sms', subject: 'welcome', client: client.name, ok: true })
    } catch (err) {
      results.push({ type: 'sms', subject: 'welcome', client: client.name, ok: false, error: String(err) })
    }

    // Sorteios email
    try {
      const html = buildEmailHtml(sorteiosBody(client.name), EVENT)
      const id = await sendEmail({ to: client.email, toName: client.name, subject: `${EVENT} · APP Sorteios`, html })
      results.push({ type: 'email', subject: 'sorteios', client: client.name, ok: true, id })
    } catch (err) {
      results.push({ type: 'email', subject: 'sorteios', client: client.name, ok: false, error: String(err) })
    }

    // Sorteios SMS
    try {
      await sendSms({ to: client.phone, message: smsSorteios })
      results.push({ type: 'sms', subject: 'sorteios', client: client.name, ok: true })
    } catch (err) {
      results.push({ type: 'sms', subject: 'sorteios', client: client.name, ok: false, error: String(err) })
    }
  }

  return NextResponse.json({ results })
}
