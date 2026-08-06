jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'))
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor } from '@testing-library/react-native'
import CatalogoScreen from '../../../app/(tabs)/catalogo'
import type { StockCategory, CatalogMaterial } from '../../../lib/catalog'

const mockFetchCategories = jest.fn<(...args: unknown[]) => Promise<StockCategory[]>>()
const mockFetchCatalogMaterials = jest.fn<(...args: unknown[]) => Promise<CatalogMaterial[]>>()

jest.mock('../../../lib/catalog', () => ({
  fetchCategories: (...args: unknown[]) => mockFetchCategories(...args),
  fetchCatalogMaterials: (...args: unknown[]) => mockFetchCatalogMaterials(...args),
}))
jest.mock('../../../lib/supabase', () => ({ supabase: {} }))
jest.mock('../../../hooks/useCart', () => ({ useCart: () => ({ addItem: jest.fn(), items: [] }) }))

beforeEach(() => {
  mockFetchCategories.mockReset()
  mockFetchCatalogMaterials.mockReset()
  mockFetchCategories.mockResolvedValue([])
})

describe('CatalogoScreen', () => {
  it('shows 6 skeleton placeholders while materials are loading', () => {
    mockFetchCatalogMaterials.mockReturnValue(new Promise(() => {}))
    const { getAllByTestId } = render(<CatalogoScreen />)

    expect(getAllByTestId('material-card-skeleton')).toHaveLength(6)
  })

  it('shows empty state when there are no materials', async () => {
    mockFetchCatalogMaterials.mockResolvedValue([])
    const { getByText } = render(<CatalogoScreen />)

    await waitFor(() => {
      expect(getByText('Nenhum material encontrado.')).toBeTruthy()
    })
  })

  it('renders a list of materials', async () => {
    mockFetchCatalogMaterials.mockResolvedValue([
      {
        id: 'm1',
        name: 'Coluna JBL',
        description: null,
        category_id: null,
        unit: 'un',
        photo_url: null,
        available: true,
      },
    ])
    const { getByText } = render(<CatalogoScreen />)

    await waitFor(() => {
      expect(getByText('Coluna JBL')).toBeTruthy()
    })
  })
})
