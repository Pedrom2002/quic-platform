import Image from 'next/image'
import { PackageIcon } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import type { StockCatalogMaterial, StockCategory } from '@/lib/stock/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter } from '@/components/ui/card'

import { AddToCartButton } from './add-to-cart-button'
import { CatalogFilters } from './catalog-filters'
import { CatalogPagination } from './catalog-pagination'

const PAGE_SIZE = 12

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string; page?: string }>
}) {
  const params = await searchParams
  const search = params.q?.trim() ?? ''
  const categoryId = params.categoria ?? ''
  const requestedPage = Number.parseInt(params.page ?? '1', 10)
  const page = Number.isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage

  const supabase = await createClient()

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let materialsQuery = supabase
    .from('stock_catalog_materials')
    .select('*', { count: 'exact' })
    .order('name')
    .range(from, to)
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
  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name])
  )
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))
  const paginationParams = {
    ...(search ? { q: search } : {}),
    ...(categoryId ? { categoria: categoryId } : {}),
  }

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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {materials.map((material) => (
            <Card key={material.id}>
              {material.photo_url && (
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl">
                  <Image
                    src={material.photo_url}
                    alt={material.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
              )}
              <CardContent className="flex flex-1 flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {material.category_id
                      ? (categoryNames.get(material.category_id) ?? 'Outros')
                      : 'Outros'}
                  </p>
                  <Badge
                    variant={material.available ? 'subtle' : 'outline'}
                    className="shrink-0"
                  >
                    {material.available ? 'Disponível' : 'Sob consulta'}
                  </Badge>
                </div>
                <h2 className="font-heading leading-snug font-semibold">
                  {material.name}
                </h2>
              </CardContent>
              <CardFooter className="border-0 bg-transparent pt-0">
                <AddToCartButton
                  materialId={material.id}
                  name={material.name}
                  unit={material.unit}
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <CatalogPagination
        params={paginationParams}
        page={page}
        totalPages={totalPages}
      />
    </div>
  )
}
