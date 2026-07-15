import { createClient } from '@/lib/supabase/server'
import type { StockCategory } from '@/lib/stock/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { CategoryCreateForm } from './category-create-form'
import { CategoryRowActions } from './category-row-actions'

export default async function CategoriasPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('stock_categories')
    .select('*')
    .order('sort_order')
    .order('name')
  const categories = (data ?? []) as StockCategory[]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Categorias</h1>
        <p className="text-sm text-muted-foreground">
          Categorias usadas para organizar os materiais.
        </p>
      </div>

      <CategoryCreateForm />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="w-24">Ordem</TableHead>
            <TableHead className="w-40 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={3}
                className="text-center text-muted-foreground"
              >
                Sem categorias.
              </TableCell>
            </TableRow>
          )}
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell>{category.sort_order}</TableCell>
              <TableCell className="text-right">
                <CategoryRowActions category={category} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
