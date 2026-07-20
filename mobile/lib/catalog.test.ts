import { describe, it, expect, jest } from '@jest/globals'
import { fetchCategories, fetchCatalogMaterials } from './catalog'

describe('fetchCategories', () => {
  it('queries categories ordered by sort_order', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: 'c1', name: 'Som', sort_order: 0 }],
      error: null,
    })
    const select = jest.fn(() => ({ order }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const result = await fetchCategories(supabase)

    expect(supabase.from).toHaveBeenCalledWith('stock_categories')
    expect(select).toHaveBeenCalledWith('*')
    expect(order).toHaveBeenCalledWith('sort_order')
    expect(result).toEqual([{ id: 'c1', name: 'Som', sort_order: 0 }])
  })

  it('returns empty array on error', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const select = jest.fn(() => ({ order }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const result = await fetchCategories(supabase)
    expect(result).toEqual([])
  })
})

describe('fetchCatalogMaterials', () => {
  function makeChain(resolved: { data: unknown; error: unknown }) {
    const range = jest.fn().mockResolvedValue(resolved)
    const order = jest.fn(() => ({ range }))
    const eq = jest.fn(() => ({ order, eq: jest.fn(() => ({ order })) }))
    const ilike = jest.fn(() => ({ order, eq }))
    const select = jest.fn(() => ({ order, eq, ilike }))
    const from = jest.fn(() => ({ select }))
    return { from, select, order, eq, ilike, range }
  }

  it('queries with no filters', async () => {
    const { from, select, order, range } = makeChain({
      data: [{ id: 'm1', name: 'Coluna JBL', description: null, category_id: null, unit: 'un', photo_url: null, available: true }],
      error: null,
    })
    const supabase = { from } as never

    const result = await fetchCatalogMaterials(supabase, { from: 0, to: 19 })

    expect(from).toHaveBeenCalledWith('stock_catalog_materials')
    expect(select).toHaveBeenCalledWith('*')
    expect(order).toHaveBeenCalledWith('name')
    expect(range).toHaveBeenCalledWith(0, 19)
    expect(result).toHaveLength(1)
  })

  it('applies search filter via ilike', async () => {
    const { from, ilike } = makeChain({ data: [], error: null })
    const supabase = { from } as never

    await fetchCatalogMaterials(supabase, { search: 'coluna', from: 0, to: 19 })

    expect(ilike).toHaveBeenCalledWith('name', '%coluna%')
  })

  it('applies category filter via eq', async () => {
    const { from, eq } = makeChain({ data: [], error: null })
    const supabase = { from } as never

    await fetchCatalogMaterials(supabase, { categoryId: 'c1', from: 0, to: 19 })

    expect(eq).toHaveBeenCalledWith('category_id', 'c1')
  })

  it('returns empty array on error', async () => {
    const { from } = makeChain({ data: null, error: { message: 'boom' } })
    const supabase = { from } as never

    const result = await fetchCatalogMaterials(supabase, { from: 0, to: 19 })
    expect(result).toEqual([])
  })
})
