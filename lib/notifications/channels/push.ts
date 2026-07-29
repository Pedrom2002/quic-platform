const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send'

interface SendPushParams {
  tokens: string[]
  title: string
  body: string
}

export async function sendPushNotifications({ tokens, title, body }: SendPushParams): Promise<string> {
  if (tokens.length === 0) return ''

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
    const data = await res.json() as { data?: Array<{ id?: string }> }
    return data.data?.[0]?.id ?? ''
  }
  throw lastErr
}
