import { formatDate } from './format'
import type { StockQuoteRequest, StockQuoteRequestItem } from './types'

export type MailtoItem = StockQuoteRequestItem & {
  stock_materials: { name: string; unit: string } | null
}

export function buildMailtoHref(
  request: StockQuoteRequest,
  items: MailtoItem[]
): string {
  const subject = `Orçamento - pedido de ${request.name}`

  const itemLines = items.map(
    (item) =>
      `- ${item.quantity}x ${item.stock_materials?.name ?? 'Material removido'}`
  )

  const bodyLines = [
    `Olá ${request.name},`,
    '',
    'Obrigado pelo seu pedido de orçamento. Confirmamos os seguintes itens:',
    '',
    ...itemLines,
  ]
  if (request.event_date) {
    bodyLines.push('', `Data do evento: ${formatDate(request.event_date)}`)
  }
  bodyLines.push(
    '',
    'Em breve enviaremos o orçamento detalhado.',
    '',
    'Com os melhores cumprimentos,',
    'A equipa'
  )

  const body = bodyLines.join('\r\n')

  return `mailto:${request.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
