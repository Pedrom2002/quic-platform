import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import type { StockCatalogMaterial } from '@/lib/stock/types'

const PAGE_SIZE = 12

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const search = searchParams.get('q')?.trim() ?? ''
  const categoryId = searchParams.get('categoria') ?? ''
  const requestedPage = Number.parseInt(searchParams.get('page') ?? '1', 10)
  const page = Number.isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage

  const supabase = await createClient()

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('stock_catalog_materials')
    .select('*', { count: 'exact' })
    .order('photo_url', { ascending: false, nullsFirst: false })
    .order('name')
    .range(from, to)
  if (search) {
    query = query.ilike('name', `%${search}%`)
  }
  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const { data, count, error } = await query
  if (error) {
    return NextResponse.json({ error: 'Erro ao carregar materiais' }, { status: 500 })
  }

  const materials = (data ?? []) as StockCatalogMaterial[]
  const total = count ?? 0
  const hasMore = page * PAGE_SIZE < total

  return NextResponse.json({ materials, hasMore, page, total })
}
