const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send'

interface SendPushParams {
  tokens: string[]
  title: string
  body: string
}

export interface SendPushResult {
  id: string
  // Tokens que a Expo Push API reportou como definitivamente mortos
  // (DeviceNotRegistered) — o chamador deve apaga-los de client_push_tokens
  // para não voltar a tentar enviar para eles.
  invalidTokens: string[]
}

interface ExpoPushTicket {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string }
}

export async function sendPushNotifications({ tokens, title, body }: SendPushParams): Promise<SendPushResult> {
  if (tokens.length === 0) return { id: '', invalidTokens: [] }

  const messages = tokens.map(to => ({ to, title, body }))
  const requestBody = JSON.stringify(messages)

  const headers = {
    'content-type': 'application/json',
    accept: 'application/json',
  }

  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 500))
    let res: Response
    try {
      res = await fetch(EXPO_PUSH_API, { method: 'POST', headers, body: requestBody })
    } catch (err) {
      lastErr = err
      continue
    }
    if (!res.ok) {
      const text = await res.text()
      if (res.status < 500) throw new Error(`Expo Push ${res.status}: ${text}`)
      lastErr = new Error(`Expo Push ${res.status}: ${text}`)
      continue
    }
    const data = await res.json() as { data?: ExpoPushTicket[] }
    const tickets = data.data ?? []
    const invalidTokens = tokens.filter((_, i) => tickets[i]?.status === 'error' && tickets[i]?.details?.error === 'DeviceNotRegistered')
    const firstOkId = tickets.find(t => t.status === 'ok')?.id ?? tickets[0]?.id ?? ''
    return { id: firstOkId, invalidTokens }
  }
  throw lastErr
}
