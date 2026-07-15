'use client'

import { useRouter, useSearchParams } from 'next/navigation'

import type { StockCategory } from '@/lib/stock/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL_CATEGORIES = 'all'

export function MaterialsFilters({
  categories,
}: {
  categories: StockCategory[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentSearch = searchParams.get('q') ?? ''
  const currentCategory = searchParams.get('categoria') ?? ALL_CATEGORIES

  function navigate(search: string, categoryId: string) {
    const params = new URLSearchParams()
    if (search) {
      params.set('q', search)
    }
    if (categoryId && categoryId !== ALL_CATEGORIES) {
      params.set('categoria', categoryId)
    }
    const query = params.toString()
    router.replace(
      query
        ? `/dashboard/stock/materiais?${query}`
        : '/dashboard/stock/materiais'
    )
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    navigate(String(formData.get('q') ?? '').trim(), currentCategory)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-3"
    >
      <Input
        name="q"
        placeholder="Pesquisar por nome..."
        defaultValue={currentSearch}
        className="w-full max-w-xs"
      />
      <Select
        value={currentCategory}
        onValueChange={(value) =>
          navigate(currentSearch, value ?? ALL_CATEGORIES)
        }
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CATEGORIES}>Todas as categorias</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" variant="secondary">
        Pesquisar
      </Button>
    </form>
  )
}
