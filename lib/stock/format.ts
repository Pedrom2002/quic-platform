import type {
  StockEventStatus,
  StockMovementType,
  StockQuoteRequestStatus,
} from './types'

// Datas "date" do Postgres chegam como 'YYYY-MM-DD'; formatar em UTC evita
// desvios de fuso horário (new Date('YYYY-MM-DD') é meia-noite UTC).
const dateFormatter = new Intl.DateTimeFormat('pt-PT', {
  dateStyle: 'short',
  timeZone: 'UTC',
})

const dateTimeFormatter = new Intl.DateTimeFormat('pt-PT', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Europe/Lisbon',
})

export function formatDate(value: string | null): string {
  if (!value) {
    return '-'
  }
  return dateFormatter.format(new Date(value))
}

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value))
}

export const eventStatusLabels: Record<StockEventStatus, string> = {
  planeado: 'Planeado',
  em_curso: 'Em curso',
  concluido: 'Concluído',
}

export const movementTypeLabels: Record<StockMovementType, string> = {
  saida: 'Saída',
  entrada: 'Entrada',
  dano: 'Dano',
  ajuste: 'Ajuste',
}

export const quoteStatusLabels: Record<StockQuoteRequestStatus, string> = {
  novo: 'Novo',
  em_analise: 'Em análise',
  respondido: 'Respondido',
  fechado: 'Fechado',
}
