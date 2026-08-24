'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { INVESTMENT_STATUSES } from '@/lib/golden-circle/validation'

import { updateInvestment } from './investment-actions'

const STATUS_LABELS: Record<(typeof INVESTMENT_STATUSES)[number], string> = {
  active: 'Ativo',
  returned: 'Devolvido',
  written_off: 'Anulado',
}

export interface EditableInvestment {
  id: string
  amount_cents: number
  invested_at: string
  status: string
  projected_return_cents: number | null
  realized_return_cents: number | null
}

export function InvestmentEditForm({
  projectId,
  investment,
  onSuccess,
}: {
  projectId: string
  investment: EditableInvestment
  onSuccess?: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    const euros = formData.get('amount_cents_euros')
    formData.set('amount_cents', String(Math.round(Number(euros) * 100)))

    const returnEuros = formData.get('projected_return_euros')
    if (returnEuros) formData.set('projected_return_cents', String(Math.round(Number(returnEuros) * 100)))

    const realizedEuros = formData.get('realized_return_euros')
    if (realizedEuros) formData.set('realized_return_cents', String(Math.round(Number(realizedEuros) * 100)))

    startTransition(async () => {
      const result = await updateInvestment(projectId, investment.id, formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Investimento atualizado')
      onSuccess?.()
    })
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex min-w-36 flex-1 flex-col gap-2">
          <Label htmlFor="edit-investment-amount">Montante (€)</Label>
          <Input
            id="edit-investment-amount"
            name="amount_cents_euros"
            type="number"
            step="0.01"
            min="0"
            defaultValue={(investment.amount_cents / 100).toFixed(2)}
          />
        </div>
        <div className="flex min-w-40 flex-1 flex-col gap-2">
          <Label htmlFor="edit-investment-date">Data</Label>
          <Input
            id="edit-investment-date"
            name="invested_at"
            type="date"
            defaultValue={investment.invested_at.slice(0, 10)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Estado</Label>
        <Select name="status" defaultValue={investment.status}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Estado do investimento" />
          </SelectTrigger>
          <SelectContent>
            {INVESTMENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex min-w-36 flex-1 flex-col gap-2">
          <Label htmlFor="edit-investment-return">Retorno projetado (€, opcional)</Label>
          <Input
            id="edit-investment-return"
            name="projected_return_euros"
            type="number"
            step="0.01"
            min="0"
            defaultValue={investment.projected_return_cents != null ? (investment.projected_return_cents / 100).toFixed(2) : ''}
          />
        </div>
        <div className="flex min-w-36 flex-1 flex-col gap-2">
          <Label htmlFor="edit-investment-realized">Retorno realizado (€, opcional)</Label>
          <Input
            id="edit-investment-realized"
            name="realized_return_euros"
            type="number"
            step="0.01"
            min="0"
            defaultValue={investment.realized_return_cents != null ? (investment.realized_return_cents / 100).toFixed(2) : ''}
          />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? 'A guardar...' : 'Guardar alterações'}
      </Button>
    </form>
  )
}
