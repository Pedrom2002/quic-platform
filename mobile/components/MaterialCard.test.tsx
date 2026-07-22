// mobile/components/MaterialCard.test.tsx
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'))
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'))

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, fireEvent } from '@testing-library/react-native'
import { MaterialCard } from './MaterialCard'
import type { CatalogMaterial } from '../lib/catalog'

const mockAddItem = jest.fn()
jest.mock('../hooks/useCart', () => ({ useCart: () => ({ addItem: mockAddItem }) }))

const baseMaterial: CatalogMaterial = {
  id: 'm1',
  name: 'Coluna JBL',
  description: 'Coluna ativa 500W',
  category_id: 'c1',
  unit: 'un',
  photo_url: null,
  available: true,
}

beforeEach(() => {
  mockAddItem.mockReset()
})

describe('MaterialCard', () => {
  it('renders name and availability badge', () => {
    const { getByText } = render(<MaterialCard material={baseMaterial} categoryName="Som" />)
    expect(getByText('Coluna JBL')).toBeTruthy()
    expect(getByText('Som')).toBeTruthy()
    expect(getByText('Disponível')).toBeTruthy()
  })

  it('shows "Sob consulta" when not available', () => {
    const unavailable = { ...baseMaterial, available: false }
    const { getByText } = render(<MaterialCard material={unavailable} categoryName="Som" />)
    expect(getByText('Sob consulta')).toBeTruthy()
  })

  it('shows a placeholder when there is no photo', () => {
    const { getByTestId } = render(<MaterialCard material={baseMaterial} categoryName="Som" />)
    expect(getByTestId('material-card-image-placeholder')).toBeTruthy()
  })

  it('renders the photo when present', () => {
    const withPhoto = { ...baseMaterial, photo_url: 'https://example.com/coluna.jpg' }
    const { queryByTestId } = render(<MaterialCard material={withPhoto} categoryName="Som" />)
    expect(queryByTestId('material-card-image-placeholder')).toBeNull()
  })

  it('adds the material to the cart when the add button is pressed', () => {
    const { getByTestId } = render(<MaterialCard material={baseMaterial} categoryName="Som" />)
    fireEvent.press(getByTestId('material-card-add'))
    expect(mockAddItem).toHaveBeenCalledWith({ materialId: 'm1', name: 'Coluna JBL', unit: 'un' })
  })
})
