import { createHmac } from 'node:crypto'
import { getEnv } from '@/lib/env'

const VAR_RE = /\{\{(\w+)\}\}/g

// HMAC do par sid|url para o tracking de cliques. Sem isto, o endpoint de
// redirect aceitaria qualquer URL (open redirect → phishing a partir de um
// domínio confiável). A chave é o CRON_SECRET (sempre presente, >=32 chars).
export function signTrackedLink(sid: string, url: string): string {
  return createHmac('sha256', getEnv().CRON_SECRET)
    .update(`${sid}|${url}`)
    .digest('base64url')
}

export interface ContactVars {
  nome?: string
  empresa?: string
  cargo?: string
  [key: string]: string | undefined
}

// Contact-sourced values (name/company/role, imported via CSV or entered
// manually) are attacker-controllable and get substituted into HTML email
// bodies sent to third parties. Without escaping, a malicious "company"
// value like `<img src=x onerror=...>` renders live in the sent email.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderTemplate(template: string, vars: ContactVars): string {
  return template.replace(VAR_RE, (_, key) => {
    const value = vars[key]
    return value ? escapeHtml(value) : ''
  })
}

export function injectTracking(html: string, sendId: string, appUrl: string): string {
  const withPixel = injectOpenPixel(html, sendId, appUrl)
  const withClicks = rewriteLinks(withPixel, sendId, appUrl)
  const withUnsub = injectUnsubscribeFooter(withClicks, sendId, appUrl)
  return withUnsub
}

function injectOpenPixel(html: string, sendId: string, appUrl: string): string {
  const topPixel = `<img src="${appUrl}/api/marketing/track/open?sid=${sendId}&pos=top" width="1" height="1" style="display:none" alt="">`
  const bottomPixel = `<img src="${appUrl}/api/marketing/track/open?sid=${sendId}&pos=bottom" width="1" height="1" style="display:none" alt="">`
  let out = html
  if (out.includes('<body')) {
    out = out.replace(/(<body[^>]*>)/i, `$1${topPixel}`)
  } else {
    out = topPixel + out
  }
  if (out.includes('</body>')) {
    out = out.replace('</body>', `${bottomPixel}</body>`)
  } else {
    out = out + bottomPixel
  }
  return out
}

function rewriteLinks(html: string, sendId: string, appUrl: string): string {
  return html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_, url) => {
      if (url.includes('/api/marketing/unsubscribe')) return `href="${url}"`
      const encoded = encodeURIComponent(url)
      const sig = signTrackedLink(sendId, url)
      return `href="${appUrl}/api/marketing/track/click?sid=${sendId}&url=${encoded}&sig=${sig}"`
    }
  )
}

function injectUnsubscribeFooter(html: string, sendId: string, appUrl: string): string {
  const footer = `<p style="margin-top:32px;font-size:11px;color:#a1a1aa;text-align:center;line-height:1.5">
    Entrámos em contacto por o considerarmos um potencial parceiro estratégico.
    Caso prefira não receber novas comunicações, <a href="${appUrl}/api/marketing/unsubscribe?sid=${sendId}" style="color:#a1a1aa;text-decoration:underline">cancele a subscrição aqui</a>.
  </p>`
  if (html.includes('</body>')) {
    return html.replace('</body>', `${footer}</body>`)
  }
  return html + footer
}
