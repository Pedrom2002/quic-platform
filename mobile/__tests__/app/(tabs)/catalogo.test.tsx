import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, waitFor } from '@testing-library/react-native'
import CatalogoScreen from '../../../app/(tabs)/catalogo'

const mockFetchCategories = jest.fn()
const mockFetchCatalogMaterials = jest.fn()

jest.mock('../../../lib/catalog', () => ({
  fetchCategories: (...args: unknown[]) => mockFetchCategories(...args),
  fetchCatalogMaterials: (...args: unknown[]) => mockFetchCatalogMaterials(...args),
}))
jest.mock('../../../lib/supabase', () => ({ supabase: {} }))

beforeEach(() => {
  mockFetchCategories.mockReset()
  mockFetchCatalogMaterials.mockReset()
  mockFetchCategories.mockResolvedValue([])
})

describe('CatalogoScreen', () => {
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
