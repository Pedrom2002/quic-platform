import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

// Load .env.local
const env = readFileSync(join(__dir, '../.env.local'), 'utf8')
for (const line of env.split('\n')) {
  const [k, ...v] = line.split('=')
  if (k && v.length) process.env[k.trim()] = v.join('=').trim()
}

// Inline buildEmailHtml for test
function buildEmailHtml(body, eventName, progressPercent) {
  const urlRegex = /^https?:\/\/\S+$/
  const formatLine = l => l.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  const paragraphs = body
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .split('\n').map(raw => {
      const line = raw.trim()
      if (!line) return null
      if (urlRegex.test(line)) {
        const href = line.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
        return `<div style="text-align:center;margin:28px 0"><a href="${href}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px">Ver portal do evento →</a><p style="margin:8px 0 0;font-size:11px;color:#a1a1aa">ou copia: <span style="color:#71717a;font-family:monospace">${line}</span></p></div>`
      }
      return `<p style="margin:0 0 14px;color:#3f3f46;font-size:15px;line-height:1.7">${formatLine(line)}</p>`
    }).filter(Boolean).join('\n')

  const progressBar = progressPercent != null
    ? `<div style="margin:24px 0 8px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-size:12px;color:#71717a">Progresso do evento</span><span style="font-size:12px;font-weight:600;color:#18181b">${progressPercent}%</span></div><div style="height:6px;background:#f4f4f5;border-radius:999px;overflow:hidden"><div style="height:100%;width:${progressPercent}%;background:#16a34a;border-radius:999px"></div></div></div>`
    : ''

  return `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px"><tr><td align="center"><table width="100%" style="max-width:560px" cellpadding="0" cellspacing="0"><tr><td style="background:#18181b;padding:20px 32px;border-radius:12px 12px 0 0"><table width="100%" cellpadding="0" cellspacing="0"><tr><td><span style="color:#ffffff;font-size:18px;font-weight:700">Quic</span></td>${eventName ? `<td align="right"><span style="color:#71717a;font-size:12px">${eventName}</span></td>` : ''}</tr></table></td></tr><tr><td style="background:#ffffff;padding:32px 32px 8px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7">${paragraphs}${progressBar}</td></tr><tr><td style="background:#fafafa;padding:20px 32px;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 12px 12px"><p style="margin:0;color:#a1a1aa;font-size:11px;line-height:1.6">Este email foi enviado automaticamente pela equipa Quic em resposta a uma atualização do seu evento.<br>Para deixar de receber notificações, contacte a sua equipa Quic.</p></td></tr></table></td></tr></table></body></html>`
}

const body = `Rafael,

Tudo a correr bem na preparação do seu evento.

A etapa "Catering confirmado" acaba de ser concluída pela nossa equipa — mais um passo rumo a um evento impecável.

Neste momento, o evento encontra-se a 78% de preparação. Acompanhe cada detalhe em tempo real no portal exclusivo do seu evento:

https://quic.pt/portal/exemplo-token-demo

Qualquer questão, estamos aqui.

Equipa Quic`

const html = buildEmailHtml(body, 'Concerto Lisboa 2026', 78)

const res = await fetch('https://api.brevo.com/v3/smtp/email', {
  method: 'POST',
  headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
  body: JSON.stringify({
    sender: { name: 'QUIC', email: 'noreply@quic.pt' },
    to: [{ email: 'pedrom02.dev@gmail.com', name: 'Rafael' }],
    subject: 'Catering confirmado — Concerto Lisboa 2026',
    htmlContent: html,
  }),
})

const data = await res.json()
console.log(res.ok ? `✓ Enviado: ${data.messageId}` : `✗ Erro: ${JSON.stringify(data)}`)
