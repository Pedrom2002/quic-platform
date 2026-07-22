// mobile/hooks/useCart.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface CartItem {
  materialId: string
  name: string
  unit: string
  qty: number
}

interface CartContextValue {
  items: CartItem[]
  isReady: boolean
  addItem: (item: { materialId: string; name: string; unit: string }) => void
  removeItem: (materialId: string) => void
  setQty: (materialId: string, qty: number) => void
  clear: () => void
}

const STORAGE_KEY = 'quic-cart'

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) {
          try {
            setItems(JSON.parse(raw) as CartItem[])
          } catch {
            // ignora dados corrompidos, começa vazio
          }
        }
      })
      .finally(() => setIsReady(true))
  }, [])

  useEffect(() => {
    if (!isReady) return
    const timeout = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    }, 300)
    return () => clearTimeout(timeout)
  }, [items, isReady])

  function addItem(item: { materialId: string; name: string; unit: string }) {
    setItems(prev => {
      const existing = prev.find(i => i.materialId === item.materialId)
      if (existing) {
        return prev.map(i => (i.materialId === item.materialId ? { ...i, qty: i.qty + 1 } : i))
      }
      return [...prev, { ...item, qty: 1 }]
    })
  }

  function removeItem(materialId: string) {
    setItems(prev => prev.filter(i => i.materialId !== materialId))
  }

  function setQty(materialId: string, qty: number) {
    setItems(prev => prev.map(i => (i.materialId === materialId ? { ...i, qty: Math.max(1, qty) } : i)))
  }

  function clear() {
    setItems([])
  }

  return (
    <CartContext.Provider value={{ items, isReady, addItem, removeItem, setQty, clear }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart deve ser usado dentro de um CartProvider')
  }
  return context
}
