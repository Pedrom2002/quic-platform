'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { addMovement } from './actions'

export function AdjustmentDialog({
  materials,
}: {
  materials: { id: string; name: string }[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [materialId, setMaterialId] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await addMovement(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Ajuste registado')
      setIsOpen(false)
      setMaterialId('')
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className={buttonVariants({})}>Registar ajuste</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registar ajuste</DialogTitle>
          <DialogDescription>
            Correção manual de stock. A quantidade pode ser negativa (para
            abater) ou positiva (para repor), mas não 0.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="type" value="ajuste" />
          <input type="hidden" name="material_id" value={materialId} />

          <div className="flex flex-col gap-2">
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
                    {material.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="adjustment-quantity">Quantidade</Label>
            <Input
              id="adjustment-quantity"
              name="quantity"
              type="number"
              placeholder="Ex.: -2 ou 3"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="adjustment-notes">Notas</Label>
            <Input
              id="adjustment-notes"
              name="notes"
              placeholder="Motivo do ajuste (opcional)"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'A registar...' : 'Registar ajuste'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
