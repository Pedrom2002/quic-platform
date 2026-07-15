import type { StockMovementType } from '@/lib/stock/types'
import { movementTypeLabels } from '@/lib/stock/format'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const typeClasses: Record<StockMovementType, string> = {
  saida: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  entrada:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  dano: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  ajuste: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
}

export function MovementTypeBadge({ type }: { type: StockMovementType }) {
  return (
    <Badge
      variant="outline"
      className={cn('border-transparent', typeClasses[type])}
    >
      {movementTypeLabels[type]}
    </Badge>
  )
}
