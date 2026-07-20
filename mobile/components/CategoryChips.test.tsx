import { describe, it, expect, jest } from '@jest/globals'
import { render, fireEvent } from '@testing-library/react-native'
import { CategoryChips } from './CategoryChips'
import type { StockCategory } from '../lib/catalog'

const categories: StockCategory[] = [
  { id: 'c1', name: 'Som', sort_order: 0 },
  { id: 'c2', name: 'Luz', sort_order: 1 },
]

describe('CategoryChips', () => {
  it('renders "Todas" plus one chip per category', () => {
    const { getByText } = render(
      <CategoryChips categories={categories} selectedId={null} onSelect={jest.fn()} />
    )
    expect(getByText('Todas')).toBeTruthy()
    expect(getByText('Som')).toBeTruthy()
    expect(getByText('Luz')).toBeTruthy()
  })

  it('calls onSelect with null when "Todas" is pressed', () => {
    const onSelect = jest.fn()
    const { getByText } = render(
      <CategoryChips categories={categories} selectedId="c1" onSelect={onSelect} />
    )
    fireEvent.press(getByText('Todas'))
    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('calls onSelect with the category id when a chip is pressed', () => {
    const onSelect = jest.fn()
    const { getByText } = render(
      <CategoryChips categories={categories} selectedId={null} onSelect={onSelect} />
    )
    fireEvent.press(getByText('Luz'))
    expect(onSelect).toHaveBeenCalledWith('c2')
  })
})
