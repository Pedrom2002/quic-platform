'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { createTicketType } from './actions'

export function TicketTypeForm({ eventId }: { eventId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createTicketType(eventId, formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Tipo de bilhete criado')
      router.refresh()
    })
  }

  return (
    <form action={handleSubmit} className="grid grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input name="name" placeholder="ex: Normal" required />
      </div>
      <div className="space-y-1.5">
        <Label>Preço (cêntimos)</Label>
        <Input name="price_cents" type="number" min="0" placeholder="ex: 2000 = 20,00€" required />
      </div>
      <div className="space-y-1.5">
        <Label>Quantidade total</Label>
        <Input name="quantity_total" type="number" min="1" required />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'A criar...' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
