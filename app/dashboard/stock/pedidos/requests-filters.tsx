'use client'

import { useRouter, useSearchParams } from 'next/navigation'

import type { StockQuoteRequestStatus } from '@/lib/stock/types'
import { quoteStatusLabels } from '@/lib/stock/format'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL = 'all'

const statusOptions = Object.entries(quoteStatusLabels) as [
  StockQuoteRequestStatus,
  string,
][]

export function RequestsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentStatus = searchParams.get('estado') ?? ALL

  function navigate(status: string) {
    const params = new URLSearchParams()
    if (status !== ALL) {
      params.set('estado', status)
    }
    const query = params.toString()
    router.replace(
      query ? `/dashboard/stock/pedidos?${query}` : '/dashboard/stock/pedidos'
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={currentStatus}
        onValueChange={(value) => navigate(value ?? ALL)}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os estados</SelectItem>
          {statusOptions.map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
