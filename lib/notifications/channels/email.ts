import { getEnv } from '@/lib/env'

const BREVO_API = 'https://api.brevo.com/v3/smtp/email'

interface SendEmailParams {
  to: string
  toName?: string
  subject: string
  html: string
}

export async function sendEmail({ to, toName, subject, html }: SendEmailParams): Promise<string> {
  const { BREVO_API_KEY: apiKey, EMAIL_FROM } = getEnv()
  if (!apiKey) throw new Error('BREVO_API_KEY não configurado')

  const from = EMAIL_FROM ?? 'QUIC <noreply@quic.pt>'
  const match = from.match(/^(.+?)\s*<(.+?)>$/)
  const sender = match
    ? { name: match[1].trim(), email: match[2].trim() }
    : { email: from }

  const res = await fetch(BREVO_API, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to, name: toName }],
      subject,
      htmlContent: html,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Brevo ${res.status}: ${body}`)
  }

  const data = await res.json() as { messageId?: string }
  return data.messageId ?? ''
}

export function buildEmailHtml(body: string, eventName?: string, progressPercent?: number): string {
  // Parse **bold** markers
  const formatLine = (line: string) =>
    line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // Detect portal URL line and convert to CTA button
  const urlRegex = /^https?:\/\/\S+$/
  const paragraphs = body
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .split('\n')
    .map(raw => {
      const line = raw.trim()
      if (!line) return null
      // URL alone on a line → CTA button
      // Re-unescape to get the raw URL, then validate scheme before using as href
      if (urlRegex.test(line)) {
        const href = line.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        // Only allow https:// links as hrefs to prevent javascript: or data: injection
        if (!href.startsWith('https://') && !href.startsWith('http://')) return null
        const safeHref = href.replace(/"/g, '%22')
        return `<div style="text-align:center;margin:28px 0">
          <a href="${safeHref}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;letter-spacing:0.01em">
            Ver portal do evento →
          </a>
          <p style="margin:8px 0 0;font-size:11px;color:#a1a1aa">ou copia: <span style="color:#71717a;font-family:monospace">${line}</span></p>
        </div>`
      }
      return `<p style="margin:0 0 14px;color:#3f3f46;font-size:15px;line-height:1.7">${formatLine(line)}</p>`
    })
    .filter(Boolean)
    .join('\n')

  const progressBar = progressPercent != null
    ? `<div style="margin:24px 0 8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:12px;color:#71717a">Progresso do evento</span>
          <span style="font-size:12px;font-weight:600;color:#18181b">${progressPercent}%</span>
        </div>
        <div style="height:6px;background:#f4f4f5;border-radius:999px;overflow:hidden">
          <div style="height:100%;width:${progressPercent}%;background:#16a34a;border-radius:999px"></div>
        </div>
      </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f9fafb;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px" cellpadding="0" cellspacing="0" role="presentation">

        <!-- Header -->
        <tr>
          <td style="background:#18181b;padding:20px 32px;border-radius:12px 12px 0 0">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td>
                  <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">Quic</span>
                </td>
                ${eventName ? `<td align="right">
                  <span style="color:#71717a;font-size:12px">${eventName.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>
                </td>` : ''}
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px 32px 8px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7">
            ${paragraphs}
            ${progressBar}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#fafafa;padding:20px 32px;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 12px 12px">
            <p style="margin:0;color:#a1a1aa;font-size:11px;line-height:1.6">
              Este email foi enviado automaticamente pela equipa Quic em resposta a uma atualização do seu evento.<br>
              Para deixar de receber notificações, contacte a sua equipa Quic.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
