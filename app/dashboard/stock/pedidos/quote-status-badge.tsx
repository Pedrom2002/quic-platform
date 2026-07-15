import type { StockQuoteRequestStatus } from '@/lib/stock/types'
import { quoteStatusLabels } from '@/lib/stock/format'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const statusClasses: Record<StockQuoteRequestStatus, string> = {
  novo: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  em_analise:
    'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  respondido:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  fechado: 'bg-muted text-muted-foreground',
}

export function QuoteStatusBadge({
  status,
}: {
  status: StockQuoteRequestStatus
}) {
  return (
    <Badge
      variant="outline"
      className={cn('border-transparent', statusClasses[status])}
    >
      {quoteStatusLabels[status]}
    </Badge>
  )
}
