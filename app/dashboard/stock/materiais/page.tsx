import Image from 'next/image'

import { createClient } from '@/lib/supabase/server'
import type { StockCategory, StockMaterial } from '@/lib/stock/types'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { CatalogPagination } from '@/app/rentals/catalog-pagination'
import { getInitials } from './get-initials'
import { MaterialsFilters } from './materials-filters'

const PAGE_SIZE = 20

type MaterialRow = StockMaterial & {
  stock_categories: { name: string } | null
}

export default async function MateriaisPage({
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
    .from('stock_materials')
    .select('*, stock_categories(name)', { count: 'exact' })
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

  const materials = (materialsData ?? []) as MaterialRow[]
  const categories = (categoriesData ?? []) as StockCategory[]

  const pageIds = materials.map((material) => material.id)
  const { data: availabilityData } = pageIds.length
    ? await supabase
        .from('stock_material_availability')
        .select('*')
        .in('material_id', pageIds)
    : { data: [] }

  const availability = new Map<string, number>(
    (availabilityData ?? []).map(
      (row: { material_id: string; disponivel: number }) => [
        row.material_id,
        row.disponivel,
      ]
    )
  )
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))
  const paginationParams = {
    ...(search ? { q: search } : {}),
    ...(categoryId ? { categoria: categoryId } : {}),
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Materiais</h1>
          <p className="text-sm text-muted-foreground">
            Inventário de materiais e disponibilidade atual.
          </p>
        </div>
        <ButtonLink href="/dashboard/stock/materiais/novo">
          Novo material
        </ButtonLink>
      </div>

      <MaterialsFilters categories={categories} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">Foto</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Unidade</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Disponível</TableHead>
            <TableHead>Visível</TableHead>
            <TableHead>Ativo</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={9}
                className="text-center text-muted-foreground"
              >
                Sem materiais.
              </TableCell>
            </TableRow>
          )}
          {materials.map((material) => {
            const disponivel =
              availability.get(material.id) ?? material.quantity_total

            return (
              <TableRow key={material.id}>
                <TableCell>
                  {material.photo_url ? (
                    <Image
                      src={material.photo_url}
                      alt={material.name}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-md border object-cover"
                    />
                  ) : (
                    <div
                      aria-label="Sem foto"
                      className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted text-xs font-medium text-muted-foreground"
                    >
                      {getInitials(material.name)}
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{material.name}</TableCell>
                <TableCell>
                  {material.stock_categories?.name ?? (
                    <span className="text-muted-foreground">Sem categoria</span>
                  )}
                </TableCell>
                <TableCell>{material.unit}</TableCell>
                <TableCell className="text-right">
                  {material.quantity_total}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={disponivel <= 0 ? 'destructive' : 'secondary'}
                  >
                    {disponivel}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={material.is_public ? 'secondary' : 'outline'}>
                    {material.is_public ? 'Sim' : 'Não'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={material.active ? 'secondary' : 'outline'}>
                    {material.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <ButtonLink
                    href={`/dashboard/stock/materiais/${material.id}`}
                    variant="outline"
                    size="sm"
                  >
                    Editar
                  </ButtonLink>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <CatalogPagination
        basePath="/dashboard/stock/materiais"
        params={paginationParams}
        page={page}
        totalPages={totalPages}
      />
    </div>
  )
}
