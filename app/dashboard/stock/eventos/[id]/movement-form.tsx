'use client'

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import type { StockMovementType } from '@/lib/stock/types'
import { movementTypeLabels } from '@/lib/stock/format'
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

import { addMovement } from '../../movimentos/actions'

export type MaterialOption = {
  id: string
  name: string
  unit: string
  disponivel: number
}

// Tipos registáveis num evento: ajuste é só do ledger global.
const eventMovementTypes: StockMovementType[] = ['saida', 'entrada', 'dano']

export function MovementForm({
  eventId,
  materials,
}: {
  eventId: string
  materials: MaterialOption[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [type, setType] = useState<StockMovementType>('saida')
  const [materialId, setMaterialId] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await addMovement(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Movimento registado')
      formRef.current?.reset()
      setMaterialId('')
    })
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="material_id" value={materialId} />

      <div className="flex w-36 flex-col gap-2">
        <Label>Tipo</Label>
        <Select
          value={type}
          onValueChange={(value) =>
            setType((value as StockMovementType | null) ?? type)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {eventMovementTypes.map((value) => (
              <SelectItem key={value} value={value}>
                {movementTypeLabels[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-w-56 flex-1 flex-col gap-2">
        <Label>Material</Label>
        <Select
          value={materialId}
          onValueChange={(value) => setMaterialId(value ?? '')}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Escolher material" />
          </SelectTrigger>
          <SelectContent>
            {materials.map((material) => (
              <SelectItem key={material.id} value={material.id}>
                {material.name} (disponível: {material.disponivel})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex w-32 flex-col gap-2">
        <Label htmlFor="movement-quantity">Quantidade</Label>
        <Input
          id="movement-quantity"
          name="quantity"
          type="number"
          min={1}
          placeholder="0"
        />
      </div>

      <div className="flex min-w-48 flex-1 flex-col gap-2">
        <Label htmlFor="movement-notes">Notas</Label>
        <Input id="movement-notes" name="notes" placeholder="Opcional" />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'A registar...' : 'Registar'}
      </Button>
    </form>
  )
}
