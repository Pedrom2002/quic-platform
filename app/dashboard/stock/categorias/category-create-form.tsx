'use client'

import { useRef, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { createCategory } from './actions'

export function CategoryCreateForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createCategory(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Categoria criada')
      formRef.current?.reset()
    })
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4"
    >
      <div className="flex min-w-48 flex-1 flex-col gap-2">
        <Label htmlFor="new-category-name">Nome</Label>
        <Input id="new-category-name" name="name" placeholder="Ex.: Som" />
      </div>
      <div className="flex w-28 flex-col gap-2">
        <Label htmlFor="new-category-sort">Ordem</Label>
        <Input
          id="new-category-sort"
          name="sort_order"
          type="number"
          min={0}
          defaultValue={0}
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'A criar...' : 'Criar categoria'}
      </Button>
    </form>
  )
}
