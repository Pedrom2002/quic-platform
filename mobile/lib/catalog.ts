import type { SupabaseClient } from '@supabase/supabase-js'

export interface StockCategory {
  id: string
  name: string
  sort_order: number
}

export interface CatalogMaterial {
  id: string
  name: string
  description: string | null
  category_id: string | null
  unit: string
  photo_url: string | null
  available: boolean
}

export async function fetchCategories(supabase: SupabaseClient): Promise<StockCategory[]> {
  const { data, error } = await supabase
    .from('stock_categories')
    .select('*')
    .order('sort_order')

  if (error || !data) return []
  return data as unknown as StockCategory[]
}

export interface FetchCatalogMaterialsParams {
  search?: string
  categoryId?: string
  from: number
  to: number
}

export async function fetchCatalogMaterials(
  supabase: SupabaseClient,
  params: FetchCatalogMaterialsParams
): Promise<CatalogMaterial[]> {
  let query = supabase.from('stock_catalog_materials').select('*')

  if (params.search) {
    query = query.ilike('name', `%${params.search}%`)
  }
  if (params.categoryId) {
    query = query.eq('category_id', params.categoryId)
  }

  const { data, error } = await query
    .order('photo_url', { ascending: false, nullsFirst: false })
    .order('name')
    .range(params.from, params.to)

  if (error || !data) return []
  return data as unknown as CatalogMaterial[]
}
