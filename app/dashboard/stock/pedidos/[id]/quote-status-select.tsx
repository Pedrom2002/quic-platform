'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import type { StockQuoteRequestStatus } from '@/lib/stock/types'
import { quoteStatusLabels } from '@/lib/stock/format'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { updateQuoteStatus } from '../actions'

const statusOptions = Object.entries(quoteStatusLabels) as [
  StockQuoteRequestStatus,
  string,
][]

export function QuoteStatusSelect({
  requestId,
  status,
}: {
  requestId: string
  status: StockQuoteRequestStatus
}) {
  const [isPending, startTransition] = useTransition()

  function handleChange(value: string | null) {
    if (!value) {
      return
    }
    startTransition(async () => {
      const formData = new FormData()
      formData.set('id', requestId)
      formData.set('status', value)
      const result = await updateQuoteStatus(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Estado atualizado')
    })
  }

  return (
    <Select
      value={status}
      onValueChange={(value) => handleChange(value)}
      disabled={isPending}
    >
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Estado" />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
