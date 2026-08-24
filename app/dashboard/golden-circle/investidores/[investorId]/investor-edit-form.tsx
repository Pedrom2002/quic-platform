'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { updateInvestorInfo } from '../actions'

export function InvestorEditForm({
  investorId,
  fullName,
  phone,
}: {
  investorId: string
  fullName: string
  phone: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateInvestorInfo(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Dados atualizados')
      setEditing(false)
    })
  }

  if (!editing) {
    return (
      <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="self-start">
        Editar
      </Button>
    )
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4 border-t pt-4 mt-2">
      <input type="hidden" name="id" value={investorId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-full-name">Nome</Label>
        <Input id="edit-full-name" name="full_name" defaultValue={fullName} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-phone">Telefone</Label>
        <Input id="edit-phone" name="phone" defaultValue={phone ?? ''} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? 'A guardar...' : 'Guardar'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)} disabled={isPending}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
