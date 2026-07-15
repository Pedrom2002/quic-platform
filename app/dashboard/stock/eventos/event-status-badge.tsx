import type { StockEventStatus } from '@/lib/stock/types'
import { eventStatusLabels } from '@/lib/stock/format'
import { Badge } from '@/components/ui/badge'

const statusVariants: Record<
  StockEventStatus,
  'default' | 'secondary' | 'outline'
> = {
  planeado: 'outline',
  em_curso: 'default',
  concluido: 'secondary',
}

export function EventStatusBadge({ status }: { status: StockEventStatus }) {
  return (
    <Badge variant={statusVariants[status]}>{eventStatusLabels[status]}</Badge>
  )
}
