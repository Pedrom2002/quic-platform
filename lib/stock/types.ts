export type StockCategory = {
  id: string
  name: string
  sort_order: number
}

// Linha da view pública stock_catalog_materials (só colunas públicas;
// disponibilidade exposta apenas como booleano).
export type StockCatalogMaterial = {
  id: string
  name: string
  description: string | null
  category_id: string | null
  unit: string
  photo_url: string | null
  available: boolean
}
