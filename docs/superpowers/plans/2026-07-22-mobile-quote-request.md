# App mobile Quic: pedido de orçamento a partir do catálogo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar à app mobile um carrinho de materiais (persistido em AsyncStorage) e um ecrã de pedido de orçamento, reutilizando integralmente o RPC `stock_submit_quote` já existente no backend (sem qualquer mudança à BD).

**Architecture:** `mobile/lib/quote.ts` porta a validação e a chamada ao RPC (lógica pura, testável). `mobile/hooks/useCart.tsx` fornece o estado global do carrinho via Context, persistido em AsyncStorage. `MaterialCard` ganha um botão "+", o catálogo ganha um botão flutuante, e um novo ecrã `mobile/app/pedido.tsx` faz a submissão.

**Tech Stack:** Expo Router, `@supabase/supabase-js` (RPC), `@react-native-async-storage/async-storage`, React Context, Jest + `@testing-library/react-native`.

---

## Nota sobre localização de testes (regra crítica deste projeto)

Ficheiros `.test.tsx` que testam ecrãs sob `mobile/app/` NUNCA vivem dentro de `mobile/app/`. O teste do ecrã `pedido` vai em `mobile/__tests__/app/pedido.test.tsx`. Testes de lib/hooks/componentes vivem ao lado do ficheiro (`mobile/lib/`, `mobile/hooks/`, `mobile/components/`).

## Nota sobre mocks de reanimated (padrão já estabelecido no projeto)

Qualquer teste que renderize um componente que importe (direta ou transitivamente) `react-native-reanimated` (ex.: `MaterialCard`) precisa destas duas linhas no topo do ficheiro de teste, antes dos imports:
```ts
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'))
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'))
```
Só adicionar onde o teste falha sem elas (confirmar correndo primeiro). Testes de lib pura (`quote.test.ts`) não precisam.

---

### Task 1: `mobile/lib/quote.ts` (validação + submissão via RPC)

**Files:**
- Create: `mobile/lib/quote.ts`
- Create: `mobile/lib/quote.test.ts`

- [ ] **Step 1: Escrever o teste que falha primeiro**

```ts
// mobile/lib/quote.test.ts
import { describe, it, expect, jest } from '@jest/globals'
import { validateQuote, submitQuote, type QuoteFormInput, type CartLine } from './quote'

const validForm: QuoteFormInput = {
  name: 'Maria',
  email: 'maria@example.com',
  phone: '',
  eventDate: '',
  message: '',
}
const items: CartLine[] = [{ materialId: '11111111-1111-1111-1111-111111111111', qty: 2 }]

describe('validateQuote', () => {
  it('returns null for a valid input', () => {
    expect(validateQuote(validForm, items)).toBeNull()
  })

  it('rejects an empty name', () => {
    expect(validateQuote({ ...validForm, name: '   ' }, items)).toBe('Nome obrigatório')
  })

  it('rejects an invalid email', () => {
    expect(validateQuote({ ...validForm, email: 'not-an-email' }, items)).toBe('Email inválido')
  })

  it('rejects an empty cart', () => {
    expect(validateQuote(validForm, [])).toBe('Adicione pelo menos um material ao pedido')
  })
})

describe('submitQuote', () => {
  it('calls stock_submit_quote with mapped params and returns success', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: 'req-1', error: null })
    const supabase = { rpc } as never

    const result = await submitQuote(
      supabase,
      { name: 'Maria', email: 'maria@example.com', phone: '', eventDate: '', message: '' },
      items
    )

    expect(rpc).toHaveBeenCalledWith('stock_submit_quote', {
      p_name: 'Maria',
      p_email: 'maria@example.com',
      p_phone: null,
      p_event_date: null,
      p_message: null,
      p_items: [{ materialId: '11111111-1111-1111-1111-111111111111', qty: 2 }],
    })
    expect(result).toEqual({ success: true })
  })

  it('passes optional fields through when present', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: 'req-1', error: null })
    const supabase = { rpc } as never

    await submitQuote(
      supabase,
      { name: 'Maria', email: 'maria@example.com', phone: '912345678', eventDate: '2026-09-01', message: 'olá' },
      items
    )

    expect(rpc).toHaveBeenCalledWith('stock_submit_quote', {
      p_name: 'Maria',
      p_email: 'maria@example.com',
      p_phone: '912345678',
      p_event_date: '2026-09-01',
      p_message: 'olá',
      p_items: items,
    })
  })

  it('maps a rate_limit error to a friendly message', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'rate_limit' } })
    const supabase = { rpc } as never
    const result = await submitQuote(supabase, validForm, items)
    expect(result).toEqual({ success: false, error: 'Demasiados pedidos. Tente novamente mais tarde.' })
  })

  it('maps an invalid_items error to a friendly message', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'invalid_items' } })
    const supabase = { rpc } as never
    const result = await submitQuote(supabase, validForm, items)
    expect(result).toEqual({ success: false, error: 'Pedido inválido.' })
  })

  it('maps any other error to the generic message', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const supabase = { rpc } as never
    const result = await submitQuote(supabase, validForm, items)
    expect(result).toEqual({ success: false, error: 'Não foi possível submeter o pedido. Tente novamente.' })
  })

  it('never throws when the rpc call rejects', async () => {
    const rpc = jest.fn().mockRejectedValue(new Error('network down'))
    const supabase = { rpc } as never
    const result = await submitQuote(supabase, validForm, items)
    expect(result).toEqual({ success: false, error: 'Não foi possível submeter o pedido. Tente novamente.' })
  })
})
```

- [ ] **Step 2: Correr e confirmar falha**

Run: `cd mobile && npx jest --runInBand quote.test.ts`
Expected: FAIL, `Cannot find module './quote'`

- [ ] **Step 3: Implementar**

```ts
// mobile/lib/quote.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export interface QuoteFormInput {
  name: string
  email: string
  phone: string
  eventDate: string
  message: string
}

export interface CartLine {
  materialId: string
  qty: number
}

export type QuoteResult = { success: true } | { success: false; error: string }

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const GENERIC_ERROR = 'Não foi possível submeter o pedido. Tente novamente.'

export function validateQuote(form: QuoteFormInput, items: CartLine[]): string | null {
  if (form.name.trim() === '') return 'Nome obrigatório'
  if (!EMAIL_REGEX.test(form.email.trim())) return 'Email inválido'
  if (items.length === 0) return 'Adicione pelo menos um material ao pedido'
  return null
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export async function submitQuote(
  supabase: SupabaseClient,
  form: QuoteFormInput,
  items: CartLine[]
): Promise<QuoteResult> {
  try {
    const { error } = await supabase.rpc('stock_submit_quote', {
      p_name: form.name.trim(),
      p_email: form.email.trim(),
      p_phone: emptyToNull(form.phone),
      p_event_date: emptyToNull(form.eventDate),
      p_message: emptyToNull(form.message),
      p_items: items,
    })

    if (error) {
      if (error.message.includes('rate_limit')) {
        return { success: false, error: 'Demasiados pedidos. Tente novamente mais tarde.' }
      }
      if (error.message.includes('invalid_items')) {
        return { success: false, error: 'Pedido inválido.' }
      }
      return { success: false, error: GENERIC_ERROR }
    }

    return { success: true }
  } catch {
    return { success: false, error: GENERIC_ERROR }
  }
}
```

- [ ] **Step 4: Correr e confirmar sucesso**

Run: `cd mobile && npx jest --runInBand quote.test.ts`
Expected: PASS (todos os testes)

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/quote.ts mobile/lib/quote.test.ts
git commit -m "feat(mobile): logica de validacao e submissao de pedido de orcamento"
```

---

### Task 2: `mobile/hooks/useCart.tsx` (carrinho persistido)

**Files:**
- Create: `mobile/hooks/useCart.tsx`
- Create: `mobile/hooks/useCart.test.tsx`

- [ ] **Step 1: Escrever o teste que falha primeiro**

```tsx
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
```

- [ ] **Step 2: Correr e confirmar falha**

Run: `cd mobile && npx jest --runInBand useCart.test.tsx`
Expected: FAIL, `Cannot find module './useCart'`

- [ ] **Step 3: Implementar**

```tsx
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
    if (isReady) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    }
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
```

- [ ] **Step 4: Correr e confirmar sucesso**

Run: `cd mobile && npx jest --runInBand useCart.test.tsx`
Expected: PASS (todos os testes)

- [ ] **Step 5: Ligar o `CartProvider` ao root layout**

Modificar `mobile/app/_layout.tsx` para embrulhar o `Slot` no `CartProvider` (dentro do `SafeAreaProvider`). Substituir o ficheiro por:

```tsx
import { useEffect } from 'react'
import { Appearance } from 'react-native'
import { Slot, useRouter } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useSession } from '../hooks/useSession'
import { CartProvider } from '../hooks/useCart'

Appearance.setColorScheme('light')

export default function RootLayout() {
  const { session, loading } = useSession()
  const router = useRouter()

  useEffect(() => {
    Appearance.setColorScheme('light')
    const subscription = Appearance.addChangeListener(() => {
      Appearance.setColorScheme('light')
    })
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login')
    }
  }, [loading, session, router])

  return (
    <SafeAreaProvider>
      <CartProvider>
        <Slot />
      </CartProvider>
    </SafeAreaProvider>
  )
}
```

- [ ] **Step 6: Correr toda a suite (confirmar que nada quebrou)**

Run: `cd mobile && npx jest --runInBand`
Expected: PASS em tudo

- [ ] **Step 7: Commit**

```bash
git add mobile/hooks/useCart.tsx mobile/hooks/useCart.test.tsx "mobile/app/_layout.tsx"
git commit -m "feat(mobile): carrinho de materiais persistido em AsyncStorage"
```

---

### Task 3: Botão "+" no `MaterialCard`

**Files:**
- Modify: `mobile/components/MaterialCard.tsx`
- Modify: `mobile/components/MaterialCard.test.tsx`

- [ ] **Step 1: Escrever o teste que falha primeiro (substituir o ficheiro de teste)**

```tsx
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
```

- [ ] **Step 2: Correr e confirmar falha**

Run: `cd mobile && npx jest --runInBand MaterialCard.test.tsx`
Expected: FAIL no novo teste (`Unable to find an element with testID: material-card-add`)

- [ ] **Step 3: Implementar (substituir o ficheiro)**

```tsx
// mobile/components/MaterialCard.tsx
import { useRef, useState } from 'react'
import { View, Text, Image, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeIn } from 'react-native-reanimated'
import type { CatalogMaterial } from '../lib/catalog'
import { useCart } from '../hooks/useCart'

export function MaterialCard({
  material,
  categoryName,
  index = 0,
}: {
  material: CatalogMaterial
  categoryName: string
  index?: number
}) {
  const { addItem } = useCart()
  const [justAdded, setJustAdded] = useState(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleAdd() {
    addItem({ materialId: material.id, name: material.name, unit: material.unit })
    setJustAdded(true)
    if (timeout.current) clearTimeout(timeout.current)
    timeout.current = setTimeout(() => setJustAdded(false), 1000)
  }

  return (
    <Animated.View entering={FadeIn.delay(Math.min(index, 12) * 40).duration(300)} style={styles.card}>
      {material.photo_url ? (
        <Image source={{ uri: material.photo_url }} style={styles.image} />
      ) : (
        <View testID="material-card-image-placeholder" style={styles.placeholder} />
      )}
      <Pressable
        testID="material-card-add"
        onPress={handleAdd}
        style={styles.addButton}
        accessibilityRole="button"
        accessibilityLabel={`Adicionar ${material.name} ao pedido`}
      >
        <Ionicons name={justAdded ? 'checkmark' : 'add'} size={18} color="#ffffff" />
      </Pressable>
      <View style={styles.content}>
        <Text style={styles.category}>{categoryName}</Text>
        <Text style={styles.name} numberOfLines={2}>{material.name}</Text>
        <View style={[styles.badge, material.available ? styles.badgeAvailable : styles.badgeUnavailable]}>
          <Text style={[styles.badgeText, material.available ? styles.badgeTextAvailable : styles.badgeTextUnavailable]}>
            {material.available ? 'Disponível' : 'Sob consulta'}
          </Text>
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: '#fafaf9', borderWidth: 1, borderColor: '#f5f5f4', borderRadius: 12, overflow: 'hidden', margin: 6 },
  image: { width: '100%', height: 120 },
  placeholder: { width: '100%', height: 120, backgroundColor: '#e7e5e4' },
  addButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { padding: 12, gap: 4 },
  category: { fontSize: 10, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: 1 },
  name: { fontSize: 14, fontWeight: '600', color: '#1c1917' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginTop: 4 },
  badgeAvailable: { backgroundColor: '#dcfce7' },
  badgeUnavailable: { backgroundColor: '#e7e5e4' },
  badgeText: { fontSize: 10, fontWeight: '600' },
  badgeTextAvailable: { color: '#166534' },
  badgeTextUnavailable: { color: '#78716c' },
})
```

- [ ] **Step 4: Correr e confirmar sucesso**

Run: `cd mobile && npx jest --runInBand MaterialCard.test.tsx`
Expected: PASS (5 testes)

- [ ] **Step 5: Commit**

```bash
git add mobile/components/MaterialCard.tsx mobile/components/MaterialCard.test.tsx
git commit -m "feat(mobile): botao de adicionar material ao pedido no MaterialCard"
```

---

### Task 4: Botão flutuante no catálogo

**Files:**
- Modify: `mobile/app/(tabs)/catalogo.tsx`
- Modify (talvez): `mobile/__tests__/app/(tabs)/catalogo.test.tsx`

- [ ] **Step 1: Ler o estado atual do ecrã**

Ler `mobile/app/(tabs)/catalogo.tsx` inteiro antes de editar. Estrutura atual: importa `View, Text, TextInput, FlatList, StyleSheet` de `react-native`, `Ionicons`, `useSafeAreaInsets`, `supabase`, funções de catálogo, `CategoryChips`, `MaterialCard`, `MaterialCardSkeleton`. Tem `const insets = useSafeAreaInsets()` no topo do componente. Renderiza tudo dentro de um `<View style={styles.container}>` com header + searchWrapper + `CategoryChips` + ternário (skeleton | vazio | FlatList).

- [ ] **Step 2: Implementar o botão flutuante**

No `mobile/app/(tabs)/catalogo.tsx`:

1. No import de `react-native`, acrescentar `Pressable` à lista (fica `import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from 'react-native'`).

2. Acrescentar dois imports novos no topo:
```tsx
import { useRouter } from 'expo-router'
import { useCart } from '../../hooks/useCart'
```

3. Dentro do componente `CatalogoScreen`, logo a seguir a `const insets = useSafeAreaInsets()`:
```tsx
  const router = useRouter()
  const { items } = useCart()
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0)
```

4. Imediatamente antes do `</View>` que fecha o `container` (o último do return), inserir:
```tsx
      {totalQty > 0 && (
        <Pressable
          style={styles.fab}
          onPress={() => router.push('/pedido')}
          accessibilityRole="button"
        >
          <Text style={styles.fabText}>Pedir orçamento ({totalQty})</Text>
        </Pressable>
      )}
```

5. No `StyleSheet.create`, acrescentar:
```tsx
  fab: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  fabText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
```

- [ ] **Step 3: Correr o teste do catálogo**

Run: `cd mobile && npx jest --runInBand catalogo.test.tsx`
Expected: PASS. Se falhar porque o ecrã agora chama `useCart` fora de um `CartProvider` (erro "useCart deve ser usado dentro de um CartProvider"), adicionar ao topo de `mobile/__tests__/app/(tabs)/catalogo.test.tsx`, junto dos outros `jest.mock`:
```ts
jest.mock('../../../hooks/useCart', () => ({ useCart: () => ({ items: [] }) }))
```
Só adicionar se o teste falhar sem isto.

- [ ] **Step 4: Commit**

```bash
git add "mobile/app/(tabs)/catalogo.tsx"
git commit -m "feat(mobile): botao flutuante de pedido de orcamento no catalogo"
```
(Se o `catalogo.test.tsx` também foi alterado no Step 3, incluí-lo no `git add`.)

---

### Task 5: Ecrã de pedido `mobile/app/pedido.tsx`

**Files:**
- Create: `mobile/app/pedido.tsx`
- Create: `mobile/__tests__/app/pedido.test.tsx`

- [ ] **Step 1: Escrever o teste que falha primeiro**

```tsx
// mobile/__tests__/app/pedido.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { Alert } from 'react-native'
import PedidoScreen from '../../app/pedido'

const mockUseCart = jest.fn()
const mockSubmitQuote = jest.fn()
const mockValidateQuote = jest.fn()

jest.mock('../../hooks/useCart', () => ({ useCart: () => mockUseCart() }))
jest.mock('../../lib/quote', () => ({
  submitQuote: (...args: unknown[]) => mockSubmitQuote(...args),
  validateQuote: (...args: unknown[]) => mockValidateQuote(...args),
}))
jest.mock('../../lib/supabase', () => ({ supabase: {} }))

const filledItems = [{ materialId: 'm1', name: 'Coluna', unit: 'un', qty: 2 }]

beforeEach(() => {
  mockUseCart.mockReset()
  mockSubmitQuote.mockReset()
  mockValidateQuote.mockReset()
  mockValidateQuote.mockReturnValue(null)
  mockSubmitQuote.mockResolvedValue({ success: true })
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
```

- [ ] **Step 2: Correr e confirmar falha**

Run: `cd mobile && npx jest --runInBand pedido.test.tsx`
Expected: FAIL, `Cannot find module '../../app/pedido'`

- [ ] **Step 3: Implementar**

```tsx
// mobile/app/pedido.tsx
import { useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCart } from '../hooks/useCart'
import { supabase } from '../lib/supabase'
import { validateQuote, submitQuote } from '../lib/quote'

export default function PedidoScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { items, isReady, setQty, removeItem, clear } = useCart()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setError(null)
    const form = { name, email, phone, eventDate, message }
    const lines = items.map(i => ({ materialId: i.materialId, qty: i.qty }))
    const validationError = validateQuote(form, lines)
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    const result = await submitQuote(supabase, form, lines)
    setSubmitting(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    clear()
    Alert.alert('Pedido enviado', 'Respondemos com um orçamento sem compromisso.')
    router.replace('/(tabs)/catalogo')
  }

  if (isReady && items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>O teu pedido está vazio</Text>
        <Text style={styles.emptyText}>Adiciona materiais no catálogo para pedir um orçamento.</Text>
        <Pressable style={styles.emptyButton} onPress={() => router.replace('/(tabs)/catalogo')} accessibilityRole="button">
          <Text style={styles.emptyButtonText}>Ver catálogo</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
      <Text style={styles.heading}>Pedido de orçamento</Text>

      <Text style={styles.sectionLabel}>Materiais</Text>
      {items.map(item => (
        <View key={item.materialId} style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemUnit}>Unidade: {item.unit}</Text>
          </View>
          <Pressable
            style={styles.qtyButton}
            onPress={() => setQty(item.materialId, item.qty - 1)}
            accessibilityRole="button"
            accessibilityLabel={`Diminuir quantidade de ${item.name}`}
          >
            <Text style={styles.qtyButtonText}>−</Text>
          </Pressable>
          <Text style={styles.qtyValue}>{item.qty}</Text>
          <Pressable
            style={styles.qtyButton}
            onPress={() => setQty(item.materialId, item.qty + 1)}
            accessibilityRole="button"
            accessibilityLabel={`Aumentar quantidade de ${item.name}`}
          >
            <Text style={styles.qtyButtonText}>+</Text>
          </Pressable>
          <Pressable
            style={styles.removeButton}
            onPress={() => removeItem(item.materialId)}
            accessibilityRole="button"
            accessibilityLabel={`Remover ${item.name}`}
          >
            <Text style={styles.removeButtonText}>Remover</Text>
          </Pressable>
        </View>
      ))}

      <Text style={styles.sectionLabel}>Os teus dados</Text>
      <TextInput style={styles.input} placeholder="Nome *" placeholderTextColor="#a8a29e" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email *" placeholderTextColor="#a8a29e" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Telefone (opcional)" placeholderTextColor="#a8a29e" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Data do evento (AAAA-MM-DD, opcional)" placeholderTextColor="#a8a29e" value={eventDate} onChangeText={setEventDate} />
      <TextInput style={[styles.input, styles.messageInput]} placeholder="Mensagem (opcional)" placeholderTextColor="#a8a29e" value={message} onChangeText={setMessage} multiline />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={submitting} accessibilityRole="button">
        <Text style={styles.submitButtonText}>{submitting ? 'A enviar...' : 'Enviar pedido'}</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  heading: { fontSize: 24, fontWeight: '800', color: '#1c1917', paddingHorizontal: 20, paddingTop: 20 },
  sectionLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#a8a29e', paddingHorizontal: 20, marginTop: 20, marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 8 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1c1917' },
  itemUnit: { fontSize: 12, color: '#78716c' },
  qtyButton: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f0efee', justifyContent: 'center', alignItems: 'center' },
  qtyButtonText: { fontSize: 18, color: '#1c1917', fontWeight: '600' },
  qtyValue: { minWidth: 24, textAlign: 'center', fontSize: 14, color: '#1c1917' },
  removeButton: { paddingHorizontal: 8, paddingVertical: 4 },
  removeButtonText: { fontSize: 12, color: '#b91c1c', fontWeight: '600' },
  input: { marginHorizontal: 20, marginBottom: 10, backgroundColor: '#f5f5f4', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1c1917' },
  messageInput: { minHeight: 100, textAlignVertical: 'top' },
  error: { color: '#b91c1c', fontSize: 13, paddingHorizontal: 20, marginBottom: 8 },
  submitButton: { marginHorizontal: 20, marginTop: 8, backgroundColor: '#111111', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  emptyContainer: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1c1917' },
  emptyText: { fontSize: 14, color: '#78716c', textAlign: 'center' },
  emptyButton: { marginTop: 12, backgroundColor: '#111111', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  emptyButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
})
```

- [ ] **Step 4: Correr e confirmar sucesso**

Run: `cd mobile && npx jest --runInBand pedido.test.tsx`
Expected: PASS (4 testes)

- [ ] **Step 5: Correr toda a suite mobile**

Run: `cd mobile && npx jest --runInBand`
Expected: PASS em tudo

- [ ] **Step 6: Verificar que o bundle continua a exportar**

Run: `cd mobile && npx expo export --platform ios`
Expected: sucesso, sem erros. Depois: `rm -rf mobile/dist`

- [ ] **Step 7: Commit**

```bash
git add mobile/app/pedido.tsx "mobile/__tests__/app/pedido.test.tsx"
git commit -m "feat(mobile): ecra de pedido de orcamento com submissao via RPC"
```

---

### Task 6: Verificação manual

**Files:** nenhum (checkpoint manual)

- [ ] **Step 1: Arrancar a app**

Run: `cd mobile && npx expo start -c` (cache limpa). Login como cliente.

- [ ] **Step 2: Adicionar ao carrinho**

No Catálogo, tocar no "+" de alguns materiais. Confirmar: o ícone muda para check por 1s; o botão flutuante "Pedir orçamento (N)" aparece com o total correto.

- [ ] **Step 3: Rever e submeter**

Tocar no botão flutuante. No ecrã de pedido: ajustar quantidades (−/+), remover um item, preencher nome + email. Tocar "Enviar pedido".

- [ ] **Step 4: Confirmar sucesso e persistência**

Confirmar o alert "Pedido enviado" e o regresso ao catálogo com o carrinho vazio. Confirmar na BD (SQL Editor): `select * from stock_quote_requests order by created_at desc limit 1;` e os respetivos `stock_quote_request_items`. Testar também: fechar e reabrir a app com itens no carrinho antes de submeter, confirmar que persistem (AsyncStorage).

---

## Fora de escopo (relembrando do spec)

Qualquer mudança ao backend/BD, validação de stock disponível, histórico de pedidos na app, notificações push.
