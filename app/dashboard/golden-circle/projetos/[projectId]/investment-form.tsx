'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import type { Investor } from '@/types/database'
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

import { createInvestment } from './investment-actions'

export function InvestmentForm({
  projectId,
  approvedInvestors,
  onSuccess,
}: {
  projectId: string
  approvedInvestors: Pick<Investor, 'id' | 'full_name'>[]
  onSuccess?: () => void
}) {
  const [investorId, setInvestorId] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    const euros = formData.get('amount_cents_euros')
    formData.set('amount_cents', String(Math.round(Number(euros) * 100)))

    const returnEuros = formData.get('projected_return_euros')
    if (returnEuros) {
      formData.set('projected_return_cents', String(Math.round(Number(returnEuros) * 100)))
    }

    startTransition(async () => {
      const result = await createInvestment(projectId, formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Investimento registado')
      onSuccess?.()
    })
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="investor_id" value={investorId} />
      <div className="flex flex-col gap-2">
        <Label>Investidor</Label>
        <Select value={investorId} onValueChange={(v) => setInvestorId(v ?? '')}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Escolhe um investidor aprovado" />
          </SelectTrigger>
          <SelectContent>
            {approvedInvestors.map((investor) => (
              <SelectItem key={investor.id} value={investor.id}>{investor.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex min-w-36 flex-1 flex-col gap-2">
          <Label htmlFor="investment-amount">Montante (€)</Label>
          <Input id="investment-amount" name="amount_cents_euros" type="number" step="0.01" min="0" />
        </div>
        <div className="flex min-w-40 flex-1 flex-col gap-2">
          <Label htmlFor="investment-date">Data</Label>
          <Input id="investment-date" name="invested_at" type="date" />
        </div>
        <div className="flex min-w-36 flex-1 flex-col gap-2">
          <Label htmlFor="investment-return">Retorno projetado (€, opcional)</Label>
          <Input id="investment-return" name="projected_return_euros" type="number" step="0.01" min="0" />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? 'A guardar...' : 'Registar investimento'}
      </Button>
    </form>
  )
}
