import { getEnv } from '@/lib/env'

const BREVO_SMS_API = 'https://api.brevo.com/v3/transactionalSMS/sms'

interface SendSmsParams {
  to: string
  message: string
}

export async function sendSms({ to, message }: SendSmsParams): Promise<string> {
  const { BREVO_API_KEY: apiKey, BREVO_SMS_SENDER } = getEnv()
  if (!apiKey) throw new Error('BREVO_API_KEY não configurado')

  const sender = BREVO_SMS_SENDER ?? 'QUIC'

  const body = JSON.stringify({
    sender,
    recipient: to.replace(/\s/g, ''),
    content: message,
    type: 'transactional',
  })

  const headers = {
    'api-key': apiKey,
    'content-type': 'application/json',
    accept: 'application/json',
  }

  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 500))
    let res: Response
    try {
      res = await fetch(BREVO_SMS_API, { method: 'POST', headers, body, signal: AbortSignal.timeout(10_000) })
    } catch (err) {
      lastErr = err
      continue
    }
    if (!res.ok) {
      const text = await res.text()
      if (res.status < 500) throw new Error(`Brevo SMS ${res.status}: ${text}`)
      lastErr = new Error(`Brevo SMS ${res.status}: ${text}`)
      continue
    }
    const data = await res.json() as { messageId?: string }
    return data.messageId ?? ''
  }
  throw lastErr
}
