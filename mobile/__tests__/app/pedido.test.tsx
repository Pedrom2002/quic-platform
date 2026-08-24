// mobile/__tests__/app/pedido.test.tsx
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'))
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'))

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { Alert } from 'react-native'
import PedidoScreen from '../../app/pedido'

const mockUseCart = jest.fn()
const mockSubmitQuote = jest.fn<
  (...args: unknown[]) => Promise<{ success: boolean; error?: string }>
>()
const mockValidateQuote = jest.fn()

jest.mock('../../hooks/useCart', () => ({ useCart: () => mockUseCart() }))
jest.mock('../../lib/quote', () => ({
  submitQuote: (...args: unknown[]) => mockSubmitQuote(...args),
  validateQuote: (...args: unknown[]) => mockValidateQuote(...args),
}))
const mockGetSession = jest.fn<() => Promise<{ data: { session: { user: { email: string } } | null } }>>()
jest.mock('../../lib/supabase', () => ({
  supabase: { auth: { getSession: () => mockGetSession() } },
}))

const filledItems = [{ materialId: 'm1', name: 'Coluna', unit: 'un', qty: 2 }]

beforeEach(() => {
  mockUseCart.mockReset()
  mockSubmitQuote.mockReset()
  mockValidateQuote.mockReset()
  mockValidateQuote.mockReturnValue(null)
  mockSubmitQuote.mockResolvedValue({ success: true })
  mockGetSession.mockReset()
  mockGetSession.mockResolvedValue({ data: { session: null } })
  jest.spyOn(Alert, 'alert').mockImplementation(() => {})
})

describe('PedidoScreen', () => {
  it('shows the empty state when the cart is empty', () => {
    mockUseCart.mockReturnValue({ items: [], isReady: true, setQty: jest.fn(), removeItem: jest.fn(), clear: jest.fn() })
    const { getByText } = render(<PedidoScreen />)
    expect(getByText('O teu pedido está vazio')).toBeTruthy()
  })

  it('lists the cart item names', () => {
    mockUseCart.mockReturnValue({ items: filledItems, isReady: true, setQty: jest.fn(), removeItem: jest.fn(), clear: jest.fn() })
    const { getByText } = render(<PedidoScreen />)
    expect(getByText('Coluna')).toBeTruthy()
  })

  it('shows a validation error and does not submit when the form is invalid', async () => {
    mockUseCart.mockReturnValue({ items: filledItems, isReady: true, setQty: jest.fn(), removeItem: jest.fn(), clear: jest.fn() })
    mockValidateQuote.mockReturnValue('Nome obrigatório')

    const { getByText } = render(<PedidoScreen />)
    fireEvent.press(getByText('Enviar pedido'))

    await waitFor(() => expect(getByText('Nome obrigatório')).toBeTruthy())
    expect(mockSubmitQuote).not.toHaveBeenCalled()
  })

  it('submits and clears the cart when the form is valid', async () => {
    const clear = jest.fn()
    mockUseCart.mockReturnValue({ items: filledItems, isReady: true, setQty: jest.fn(), removeItem: jest.fn(), clear })

    const { getByText } = render(<PedidoScreen />)
    fireEvent.press(getByText('Enviar pedido'))

    await waitFor(() => expect(mockSubmitQuote).toHaveBeenCalled())
    expect(clear).toHaveBeenCalled()
  })
})
