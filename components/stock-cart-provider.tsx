'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  CART_STORAGE_KEY,
  addItem as addCartItem,
  parseCart,
  removeItem as removeCartItem,
  setQty as setCartQty,
  totalItems as countCartItems,
  type CartItem,
} from '@/lib/stock/cart'

type CartContextValue = {
  items: CartItem[]
  /** true depois de ler o localStorage (evita mismatch de hidratação) */
  isReady: boolean
  totalItems: number
  addItem: (item: CartItem) => void
  removeItem: (materialId: string) => void
  setQty: (materialId: string, qty: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Ler o localStorage só depois de montar: o SSR renderiza carrinho vazio
    // e o estado real chega no cliente (evita mismatch de hidratação).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(parseCart(window.localStorage.getItem(CART_STORAGE_KEY)))
    setIsReady(true)
  }, [])

  useEffect(() => {
    if (!isReady) {
      return
    }
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  }, [items, isReady])

  const addItem = useCallback((item: CartItem) => {
    setItems((current) => addCartItem(current, item))
  }, [])

  const removeItem = useCallback((materialId: string) => {
    setItems((current) => removeCartItem(current, materialId))
  }, [])

  const setQty = useCallback((materialId: string, qty: number) => {
    setItems((current) => setCartQty(current, materialId, qty))
  }, [])

  const clear = useCallback(() => {
    setItems([])
  }, [])

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      isReady,
      totalItems: countCartItems(items),
      addItem,
      removeItem,
      setQty,
      clear,
    }),
    [items, isReady, addItem, removeItem, setQty, clear]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart tem de ser usado dentro de <CartProvider>')
  }
  return context
}
