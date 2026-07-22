// mobile/hooks/useCart.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { renderHook, act, waitFor } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { CartProvider, useCart } from './useCart'

const store: Record<string, string> = {}
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => store[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      store[key] = value
    }),
  },
}))

function wrapper({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>
}

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key]
})

const material = { materialId: 'm1', name: 'Coluna', unit: 'un' }

describe('useCart', () => {
  it('starts empty and becomes ready', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.items).toEqual([])
  })

  it('adds a new item with qty 1', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.isReady).toBe(true))

    act(() => result.current.addItem(material))

    expect(result.current.items).toEqual([{ materialId: 'm1', name: 'Coluna', unit: 'un', qty: 1 }])
  })

  it('increments qty when adding the same material again', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.isReady).toBe(true))

    act(() => result.current.addItem(material))
    act(() => result.current.addItem(material))

    expect(result.current.items[0].qty).toBe(2)
  })

  it('setQty clamps to a minimum of 1', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.isReady).toBe(true))
    act(() => result.current.addItem(material))

    act(() => result.current.setQty('m1', 0))

    expect(result.current.items[0].qty).toBe(1)
  })

  it('removeItem removes the material', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.isReady).toBe(true))
    act(() => result.current.addItem(material))

    act(() => result.current.removeItem('m1'))

    expect(result.current.items).toEqual([])
  })

  it('clear empties the cart', async () => {
    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.isReady).toBe(true))
    act(() => result.current.addItem(material))

    act(() => result.current.clear())

    expect(result.current.items).toEqual([])
  })
})
