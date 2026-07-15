import { createClient } from '@/lib/supabase/server'
import type { StockCategory } from '@/lib/stock/types'

import { MaterialForm } from '../material-form'

export default async function NovoMaterialPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('stock_categories')
    .select('*')
    .order('sort_order')
  const categories = (data ?? []) as StockCategory[]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Novo material</h1>
        <p className="text-sm text-muted-foreground">
          Adicione um material ao inventário.
        </p>
      </div>
      <MaterialForm categories={categories} />
    </div>
  )
}
