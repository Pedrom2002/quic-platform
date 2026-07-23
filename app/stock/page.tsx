import { PackageIcon } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import type { StockCatalogMaterial, StockCategory } from '@/lib/stock/types'

import { CatalogFilters } from './catalog-filters'
import { CatalogInfinite } from './catalog-infinite'

const PAGE_SIZE = 12

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string }>
}) {
  const params = await searchParams
  const search = params.q?.trim() ?? ''
  const categoryId = params.categoria ?? ''

  const supabase = await createClient()

  // Infinite scroll starts at page 1; further pages load client-side via
  // /api/stock/catalog. The server only renders the first PAGE_SIZE items.
  let materialsQuery = supabase
    .from('stock_catalog_materials')
    .select('*', { count: 'exact' })
    .order('name')
    .range(0, PAGE_SIZE - 1)
  if (search) {
    materialsQuery = materialsQuery.ilike('name', `%${search}%`)
  }
  if (categoryId) {
    materialsQuery = materialsQuery.eq('category_id', categoryId)
  }

  const [{ data: materialsData, count }, { data: categoriesData }] =
    await Promise.all([
      materialsQuery,
      supabase.from('stock_categories').select('*').order('sort_order'),
    ])

  const materials = (materialsData ?? []) as StockCatalogMaterial[]
  const categories = (categoriesData ?? []) as StockCategory[]
  const hasMore = PAGE_SIZE < (count ?? 0)
  const filterParams = {
    ...(search ? { q: search } : {}),
    ...(categoryId ? { categoria: categoryId } : {}),
  }
  const categoryNames = Object.fromEntries(
    categories.map((category) => [category.id, category.name])
  )
  // Re-mount the infinite list whenever filters change so it re-seeds cleanly.
  const listKey = `${search}|${categoryId}`

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 md:px-6">
      <section className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-medium tracking-tight text-balance">
          Catálogo de material
        </h1>
        <p className="text-sm text-muted-foreground">
          {count ?? 0} materiais · {categories.length} categorias
        </p>
      </section>

      <CatalogFilters categories={categories} />

      {materials.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-20 text-center">
          <PackageIcon className="size-8 text-muted-foreground" />
          <p className="font-medium">Nenhum material encontrado</p>
          <p className="text-sm text-muted-foreground">
            Ajuste a pesquisa ou escolha outra categoria.
          </p>
        </div>
      ) : (
        <CatalogInfinite
          key={listKey}
          initialMaterials={materials}
          initialHasMore={hasMore}
          params={filterParams}
          categoryNames={categoryNames}
        />
      )}
    </div>
  )
}
