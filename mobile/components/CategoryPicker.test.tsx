jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

import { describe, it, expect, jest } from '@jest/globals'
import { render, fireEvent } from '@testing-library/react-native'
import { CategoryPicker } from './CategoryPicker'
import type { StockCategory } from '../lib/catalog'

const categories: StockCategory[] = [
  { id: 'c1', name: 'Som', sort_order: 0 },
  { id: 'c2', name: 'Luz', sort_order: 1 },
]

describe('CategoryPicker', () => {
  it('shows "Categorias" on the trigger when nothing is selected', () => {
    const { getByText } = render(
      <CategoryPicker categories={categories} selectedId={null} onSelect={jest.fn()} />
    )
    expect(getByText('Categorias')).toBeTruthy()
  })

  it('shows the selected category name on the trigger', () => {
    const { getByText } = render(
      <CategoryPicker categories={categories} selectedId="c2" onSelect={jest.fn()} />
    )
    expect(getByText('Luz')).toBeTruthy()
  })

  it('opens the modal and lists all categories when the trigger is pressed', () => {
    const { getByLabelText, getByText, getAllByText } = render(
      <CategoryPicker categories={categories} selectedId={null} onSelect={jest.fn()} />
    )
    fireEvent.press(getByLabelText('Escolher categoria'))
    expect(getAllByText('Todas').length).toBeGreaterThan(0)
    expect(getByText('Som')).toBeTruthy()
    expect(getByText('Luz')).toBeTruthy()
  })

  it('calls onSelect with the category id and closes when a grid item is pressed', () => {
    const onSelect = jest.fn()
    const { getByLabelText, getByText } = render(
      <CategoryPicker categories={categories} selectedId={null} onSelect={onSelect} />
    )
    fireEvent.press(getByLabelText('Escolher categoria'))
    fireEvent.press(getByText('Luz'))
    expect(onSelect).toHaveBeenCalledWith('c2')
  })

  it('calls onSelect with null when "Todas" is pressed', () => {
    const onSelect = jest.fn()
    const { getByLabelText, getAllByText } = render(
      <CategoryPicker categories={categories} selectedId="c1" onSelect={onSelect} />
    )
    fireEvent.press(getByLabelText('Escolher categoria'))
    fireEvent.press(getAllByText('Todas')[0])
    expect(onSelect).toHaveBeenCalledWith(null)
  })
})
