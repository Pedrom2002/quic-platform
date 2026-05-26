const VAR_RE = /\{\{(\w+)\}\}/g

export interface ContactVars {
  nome?: string
  empresa?: string
  cargo?: string
  [key: string]: string | undefined
}

export function renderTemplate(template: string, vars: ContactVars): string {
  return template.replace(VAR_RE, (_, key) => vars[key] ?? '')
}

export function injectTracking(html: string, sendId: string, appUrl: string): string {
  const withPixel = injectOpenPixel(html, sendId, appUrl)
  const withClicks = rewriteLinks(withPixel, sendId, appUrl)
  const withUnsub = injectUnsubscribeFooter(withClicks, sendId, appUrl)
  return withUnsub
}

function injectOpenPixel(html: string, sendId: string, appUrl: string): string {
  const pixel = `<img src="${appUrl}/api/marketing/track/open?sid=${sendId}" width="1" height="1" style="display:none" alt="">`
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`)
  }
  return html + pixel
}

function rewriteLinks(html: string, sendId: string, appUrl: string): string {
  return html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_, url) => {
      if (url.includes('/api/marketing/unsubscribe')) return `href="${url}"`
      const encoded = encodeURIComponent(url)
      return `href="${appUrl}/api/marketing/track/click?sid=${sendId}&url=${encoded}"`
    }
  )
}

function injectUnsubscribeFooter(html: string, sendId: string, appUrl: string): string {
  const footer = `<p style="margin-top:32px;font-size:11px;color:#a1a1aa;text-align:center">
    Recebeu este email porque faz parte da nossa lista de contactos.
    <a href="${appUrl}/api/marketing/unsubscribe?sid=${sendId}" style="color:#a1a1aa">Cancelar subscrição</a>
  </p>`
  if (html.includes('</body>')) {
    return html.replace('</body>', `${footer}</body>`)
  }
  return html + footer
}
