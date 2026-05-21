import { NextResponse } from 'next/server'
import { sendEmail, buildEmailHtml } from '@/lib/notifications/channels/email'

// TEMP — diagnostic-only route. Authenticated via EMAIL_HEALTH_SECRET header.
// Remove this file once email health is confirmed.
export async function GET(request: Request) {
  const auth = request.headers.get('x-health-secret')
  if (!auth || auth !== process.env.EMAIL_HEALTH_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const sendTo = url.searchParams.get('send_to')

  const apiKey = process.env.BREVO_API_KEY
  const emailFrom = process.env.EMAIL_FROM ?? null

  if (!apiKey) {
    return NextResponse.json({ error: 'BREVO_API_KEY missing in env' }, { status: 500 })
  }

  const headers = {
    'api-key': apiKey,
    accept: 'application/json',
    'content-type': 'application/json',
  }

  // 1) Account info — has plan + credit info
  const accountRes = await fetch('https://api.brevo.com/v3/account', { headers })
  const account = accountRes.ok ? await accountRes.json() : { _error: accountRes.status, _body: await accountRes.text() }

  // 2) Verified senders
  const sendersRes = await fetch('https://api.brevo.com/v3/senders', { headers })
  const senders = sendersRes.ok ? await sendersRes.json() : { _error: sendersRes.status, _body: await sendersRes.text() }

  // 3) Domains and DKIM/SPF status
  const domainsRes = await fetch('https://api.brevo.com/v3/senders/domains', { headers })
  const domains = domainsRes.ok ? await domainsRes.json() : { _error: domainsRes.status, _body: await domainsRes.text() }

  // 4) Optional: send a real test email
  let sendResult: { success: boolean; messageId?: string; error?: string } | null = null
  if (sendTo) {
    try {
      const html = buildEmailHtml(
        `Olá,\n\nEste é um email de teste do health check da plataforma Quic.\n\nSe estás a ler isto, o pipeline de envio está a funcionar correctamente.`,
        'Teste interno'
      )
      const messageId = await sendEmail({
        to: sendTo,
        subject: '[QUIC] Health check — teste de envio',
        html,
      })
      sendResult = { success: true, messageId }
    } catch (err) {
      sendResult = {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  return NextResponse.json({
    emailFrom,
    account,
    senders,
    domains,
    sendResult,
    timestamp: new Date().toISOString(),
  })
}
