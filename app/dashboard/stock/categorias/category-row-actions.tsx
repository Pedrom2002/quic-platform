'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import type { StockCategory } from '@/lib/stock/types'
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

import { deleteCategory, updateCategory } from './actions'

export function CategoryRowActions({ category }: { category: StockCategory }) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleUpdate(formData: FormData) {
    startTransition(async () => {
      const result = await updateCategory(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Categoria atualizada')
      setIsEditOpen(false)
    })
  }

  function handleDelete() {
    if (!confirm(`Apagar a categoria "${category.name}"?`)) {
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.set('id', category.id)
      const result = await deleteCategory(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Categoria apagada')
    })
  }

  return (
    <div className="flex justify-end gap-2">
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogTrigger className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Editar
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
            <DialogDescription>
              Altere o nome ou a ordem da categoria.
            </DialogDescription>
          </DialogHeader>
          <form action={handleUpdate} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={category.id} />
            <div className="flex flex-col gap-2">
              <Label htmlFor={`edit-name-${category.id}`}>Nome</Label>
              <Input
                id={`edit-name-${category.id}`}
                name="name"
                defaultValue={category.name}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`edit-sort-${category.id}`}>Ordem</Label>
              <Input
                id={`edit-sort-${category.id}`}
                name="sort_order"
                type="number"
                min={0}
                defaultValue={category.sort_order}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'A guardar...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Button
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={handleDelete}
      >
        Apagar
      </Button>
    </div>
  )
}
