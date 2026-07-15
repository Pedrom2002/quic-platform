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

export type StockMaterial = {
  id: string
  name: string
  description: string | null
  category_id: string | null
  unit: string
  quantity_total: number
  photo_url: string | null
  is_public: boolean
  active: boolean
  created_at: string
}

// Unidade física individual de um material (detalhe interno: código do
// inventário, nº de série, condição, localização, estado).
export type StockMaterialUnit = {
  id: string
  material_id: string
  codigo: string | null
  serial_number: string | null
  condicao: string | null
  localizacao: string | null
  status: string
  notes: string | null
  created_at: string
}

export type StockEventStatus = 'planeado' | 'em_curso' | 'concluido'

export type StockEvent = {
  id: string
  name: string
  client_name: string | null
  starts_on: string | null
  ends_on: string | null
  status: StockEventStatus
  notes: string | null
  created_at: string
}

export type StockMovementType = 'saida' | 'entrada' | 'dano' | 'ajuste'

export type StockQuoteRequestStatus =
  | 'novo'
  | 'em_analise'
  | 'respondido'
  | 'fechado'

export type StockQuoteRequest = {
  id: string
  name: string
  email: string
  phone: string | null
  event_date: string | null
  message: string | null
  status: StockQuoteRequestStatus
  created_at: string
}

export type StockQuoteRequestItem = {
  id: string
  request_id: string
  material_id: string
  quantity: number
}

export type StockMovement = {
  id: string
  material_id: string
  event_id: string | null
  type: StockMovementType
  quantity: number
  notes: string | null
  created_by: string | null
  created_at: string
}

// Perfil do utilizador da equipa (autor dos movimentos). Populado pela app no
// layout protegido; sem FK direta para stock_movements (join em memória).
export type StockProfile = {
  id: string
  display_name: string | null
  email: string | null
  updated_at: string
}
