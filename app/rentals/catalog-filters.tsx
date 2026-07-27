'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { SearchIcon } from 'lucide-react'

import type { StockCategory } from '@/lib/stock/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const ALL_CATEGORIES = 'all'

export function CatalogFilters({
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
    router.replace(query ? `/rentals?${query}` : '/rentals')
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    navigate(String(formData.get('q') ?? '').trim(), currentCategory)
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-center gap-3"
      >
        <Input
          name="q"
          type="search"
          placeholder="Pesquisar material..."
          defaultValue={currentSearch}
          aria-label="Pesquisar material por nome"
          className="w-full max-w-xs"
        />
        <Button type="submit" variant="secondary">
          <SearchIcon className="size-4" />
          Pesquisar
        </Button>
      </form>
      <nav
        aria-label="Filtrar por categoria"
        className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b pb-2"
      >
        <CategoryTab
          label="Todos"
          active={currentCategory === ALL_CATEGORIES}
          onClick={() => navigate(currentSearch, ALL_CATEGORIES)}
        />
        {categories.map((category) => (
          <CategoryTab
            key={category.id}
            label={category.name}
            active={currentCategory === category.id}
            onClick={() => navigate(currentSearch, category.id)}
          />
        ))}
      </nav>
    </div>
  )
}

function CategoryTab({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'shrink-0 border-b-2 pb-2.5 text-sm whitespace-nowrap transition-colors',
        active
          ? 'border-[#9333EA] font-semibold text-[#9333EA]'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
    </button>
  )
}
