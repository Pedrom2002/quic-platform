'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'

import type { StockCategory, StockMaterial } from '@/lib/stock/types'
import { Button, ButtonLink } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import { createMaterial, updateMaterial } from './actions'

const NO_CATEGORY = 'none'

export function MaterialForm({
  categories,
  material,
}: {
  categories: StockCategory[]
  material?: StockMaterial
}) {
  const [categoryId, setCategoryId] = useState(
    material?.category_id ?? NO_CATEGORY
  )
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = material
        ? await updateMaterial(formData)
        : await createMaterial(formData)
      if (result?.error) {
        toast.error(result.error)
      }
    })
  }

  return (
    <form action={handleSubmit} className="flex max-w-xl flex-col gap-4">
      {material && <input type="hidden" name="id" value={material.id} />}
      <input
        type="hidden"
        name="category_id"
        value={categoryId === NO_CATEGORY ? '' : categoryId}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="material-name">Nome</Label>
        <Input
          id="material-name"
          name="name"
          defaultValue={material?.name ?? ''}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="material-description">Descrição</Label>
        <Textarea
          id="material-description"
          name="description"
          rows={3}
          defaultValue={material?.description ?? ''}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <Label>Categoria</Label>
          <Select
            value={categoryId}
            onValueChange={(value) => setCategoryId(value ?? NO_CATEGORY)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CATEGORY}>Sem categoria</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-28 flex-col gap-2">
          <Label htmlFor="material-unit">Unidade</Label>
          <Input
            id="material-unit"
            name="unit"
            defaultValue={material?.unit ?? 'un'}
          />
        </div>
        <div className="flex w-36 flex-col gap-2">
          <Label htmlFor="material-quantity">Quantidade total</Label>
          <Input
            id="material-quantity"
            name="quantity_total"
            type="number"
            min={0}
            defaultValue={material?.quantity_total ?? 0}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="material-photo">Foto</Label>
        {material?.photo_url && (
          <Image
            src={material.photo_url}
            alt={material.name}
            width={96}
            height={96}
            className="h-24 w-24 rounded-md border object-cover"
          />
        )}
        <Input
          id="material-photo"
          name="photo"
          type="file"
          accept="image/*"
        />
        {material?.photo_url && (
          <p className="text-xs text-muted-foreground">
            Escolha um ficheiro apenas se quiser substituir a foto atual.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_public"
            defaultChecked={material?.is_public ?? true}
            className="size-4 accent-primary"
          />
          Visível no catálogo público
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={material?.active ?? true}
            className="size-4 accent-primary"
          />
          Ativo
        </label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'A guardar...' : 'Guardar'}
        </Button>
        <ButtonLink href="/dashboard/stock/materiais" variant="outline">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  )
}
