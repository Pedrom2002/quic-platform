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

  const body = JSON.stringify({
    sender,
    to: [{ email: to, name: toName }],
    subject,
    htmlContent: html,
  })

  const headers = {
    'api-key': apiKey,
    'content-type': 'application/json',
    accept: 'application/json',
  }

  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, attempt * 500))
    try {
      const res = await fetch(BREVO_API, { method: 'POST', headers, body, signal: AbortSignal.timeout(10_000) })
      if (!res.ok) {
        const text = await res.text()
        // 4xx = permanent failure, don't retry
        if (res.status < 500) throw new Error(`Brevo ${res.status}: ${text}`)
        lastErr = new Error(`Brevo ${res.status}: ${text}`)
        continue
      }
      const data = await res.json() as { messageId?: string }
      return data.messageId ?? ''
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr
}

export function buildArticleEmailHtml(params: {
  clientName: string
  eventName: string
  articleTitle: string
  articleUrl: string
  articleSource: string | null
  portalUrl: string
}): string {
  const appUrl = getEnv().NEXT_PUBLIC_APP_URL
  const e = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeUrl = (u: string) => (/^https?:\/\//.test(u) ? u.replace(/"/g, '%22') : '#')

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Novo artigo - ${e(params.eventName)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:580px" cellpadding="0" cellspacing="0" role="presentation">

        <!-- Header dark -->
        <tr>
          <td style="background:#111111;padding:28px 36px 24px;border-radius:12px 12px 0 0">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="padding-bottom:20px">
                  <img src="${appUrl}/logo-branco.png" alt="Quic" height="20" style="display:block;height:20px;width:auto;border:0">
                </td>
              </tr>
              <tr>
                <td>
                  <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#71717a">Imprensa</p>
                  <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.25;letter-spacing:-0.02em">${e(params.articleTitle)}</h1>
                  ${params.articleSource ? `<p style="margin:10px 0 0;font-size:12px;color:#52525b;letter-spacing:0.05em">${e(params.articleSource)}</p>` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body white -->
        <tr>
          <td style="background:#ffffff;padding:32px 36px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7">
            <p style="margin:0 0 20px;color:#3f3f46;font-size:15px;line-height:1.7">
              Ola <strong>${e(params.clientName)}</strong>,
            </p>
            <p style="margin:0 0 28px;color:#3f3f46;font-size:15px;line-height:1.7">
              O evento <strong>${e(params.eventName)}</strong> foi mencionado na imprensa. Pode consultar o artigo completo no link abaixo.
            </p>

            <!-- Article card -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px">
              <tr>
                <td style="background:#fafafa;border:1px solid #e4e4e7;border-left:3px solid #18181b;border-radius:6px;padding:20px 22px">
                  <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#18181b;line-height:1.4">${e(params.articleTitle)}</p>
                  ${params.articleSource ? `<p style="margin:0 0 12px;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.08em">${e(params.articleSource)}</p>` : '<div style="margin-bottom:12px"></div>'}
                  <a href="${safeUrl(params.articleUrl)}" style="display:inline-block;font-size:13px;font-weight:600;color:#18181b;text-decoration:none;border-bottom:1px solid #18181b;padding-bottom:1px">
                    Ler artigo &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <!-- Portal CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td align="center" style="padding:4px 0 8px">
                  <a href="${safeUrl(params.portalUrl)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:12px 32px;border-radius:8px;letter-spacing:0.02em">
                    Ver todos os artigos no portal &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#fafafa;padding:20px 36px;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 12px 12px">
            <p style="margin:0;color:#a1a1aa;font-size:11px;line-height:1.6">
              Este email foi enviado automaticamente pela equipa Quic.<br>
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

export function buildEmailHtml(body: string, eventName?: string, progressPercent?: number): string {
  const appUrl = getEnv().NEXT_PUBLIC_APP_URL
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
                  <img src="${appUrl}/logo-branco.png" alt="Quic" height="22" style="display:block;height:22px;width:auto;border:0">
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
