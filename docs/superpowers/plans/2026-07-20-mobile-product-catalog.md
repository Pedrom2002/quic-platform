# App mobile Quic: catálogo de produtos (fase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o placeholder da tab "Catálogo" da app mobile por uma navegação real ao catálogo público de material (Stock-Plat), reaproveitando a view `stock_catalog_materials` e RLS já existentes, sem carrinho nem pedido de orçamento.

**Architecture:** `mobile/lib/catalog.ts` com `fetchCategories`/`fetchCatalogMaterials`, dois componentes presentacionais (`CategoryChips`, `MaterialCard`), e a tab `catalogo.tsx` a orquestrar pesquisa + filtro de categoria + infinite scroll.

**Tech Stack:** Expo Router + `@supabase/supabase-js` (mobile), Jest + `@testing-library/react-native`.

---

## Nota sobre localização de testes (regra crítica deste projeto)

Ficheiros `.test.tsx`/`.test.ts` que testam ecrãs sob `mobile/app/` NUNCA devem viver dentro de `mobile/app/` — Expo Router trata todo o ficheiro sob `app/` como rota potencial, e um teste que importe `@testing-library/react-native` quebra `npx expo export --platform ios` (incidente já confirmado nas fases 1 e 2 deste projeto). Regra aplicada neste plano:

- Testes de ficheiros em `mobile/lib/` e `mobile/components/`: co-localizados normalmente (`mobile/lib/catalog.test.ts`, `mobile/components/MaterialCard.test.tsx`) — estes ficheiros não estão sob `mobile/app/`, sem risco.
- Teste de `mobile/app/(tabs)/catalogo.tsx`: OBRIGATORIAMENTE em `mobile/__tests__/app/(tabs)/catalogo.test.tsx`, nunca em `mobile/app/(tabs)/catalogo.test.tsx`.

Cada task abaixo que cria um teste de ecrã já reflete isto no caminho do ficheiro.

---

### Task 1: `mobile/lib/catalog.ts` (fetch de categorias e materiais)

**Files:**
- Create: `mobile/lib/catalog.ts`
- Create: `mobile/lib/catalog.test.ts`

- [ ] **Step 1: Escrever o teste que falha primeiro**

```ts
// mobile/lib/catalog.test.ts
import { describe, it, expect, jest } from '@jest/globals'
import { fetchCategories, fetchCatalogMaterials } from './catalog'

describe('fetchCategories', () => {
  it('queries categories ordered by sort_order', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: 'c1', name: 'Som', sort_order: 0 }],
      error: null,
    })
    const select = jest.fn(() => ({ order }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const result = await fetchCategories(supabase)

    expect(supabase.from).toHaveBeenCalledWith('stock_categories')
    expect(select).toHaveBeenCalledWith('*')
    expect(order).toHaveBeenCalledWith('sort_order')
    expect(result).toEqual([{ id: 'c1', name: 'Som', sort_order: 0 }])
  })

  it('returns empty array on error', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const select = jest.fn(() => ({ order }))
    const supabase = { from: jest.fn(() => ({ select })) } as never

    const result = await fetchCategories(supabase)
    expect(result).toEqual([])
  })
})

describe('fetchCatalogMaterials', () => {
  function makeChain(resolved: { data: unknown; error: unknown }) {
    const range = jest.fn().mockResolvedValue(resolved)
    const order = jest.fn(() => ({ range }))
    const eq = jest.fn(() => ({ order, eq: jest.fn(() => ({ order })) }))
    const ilike = jest.fn(() => ({ order, eq }))
    const select = jest.fn(() => ({ order, eq, ilike }))
    const from = jest.fn(() => ({ select }))
    return { from, select, order, eq, ilike, range }
  }

  it('queries with no filters', async () => {
    const { from, select, order, range } = makeChain({
      data: [{ id: 'm1', name: 'Coluna JBL', description: null, category_id: null, unit: 'un', photo_url: null, available: true }],
      error: null,
    })
    const supabase = { from } as never

    const result = await fetchCatalogMaterials(supabase, { from: 0, to: 19 })

    expect(from).toHaveBeenCalledWith('stock_catalog_materials')
    expect(select).toHaveBeenCalledWith('*')
    expect(order).toHaveBeenCalledWith('name')
    expect(range).toHaveBeenCalledWith(0, 19)
    expect(result).toHaveLength(1)
  })

  it('applies search filter via ilike', async () => {
    const { from, ilike } = makeChain({ data: [], error: null })
    const supabase = { from } as never

    await fetchCatalogMaterials(supabase, { search: 'coluna', from: 0, to: 19 })

    expect(ilike).toHaveBeenCalledWith('name', '%coluna%')
  })

  it('applies category filter via eq', async () => {
    const { from, eq } = makeChain({ data: [], error: null })
    const supabase = { from } as never

    await fetchCatalogMaterials(supabase, { categoryId: 'c1', from: 0, to: 19 })

    expect(eq).toHaveBeenCalledWith('category_id', 'c1')
  })

  it('returns empty array on error', async () => {
    const { from } = makeChain({ data: null, error: { message: 'boom' } })
    const supabase = { from } as never

    const result = await fetchCatalogMaterials(supabase, { from: 0, to: 19 })
    expect(result).toEqual([])
  })
})
```

- [ ] **Step 2: Correr o teste e confirmar falha**

Run: `cd mobile && npx jest lib/catalog.test.ts`
Expected: FAIL, `Cannot find module './catalog'`

- [ ] **Step 3: Implementar**

```ts
// mobile/lib/catalog.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export interface StockCategory {
  id: string
  name: string
  sort_order: number
}

export interface CatalogMaterial {
  id: string
  name: string
  description: string | null
  category_id: string | null
  unit: string
  photo_url: string | null
  available: boolean
}

export async function fetchCategories(supabase: SupabaseClient): Promise<StockCategory[]> {
  const { data, error } = await supabase
    .from('stock_categories')
    .select('*')
    .order('sort_order')

  if (error || !data) return []
  return data as unknown as StockCategory[]
}

export interface FetchCatalogMaterialsParams {
  search?: string
  categoryId?: string
  from: number
  to: number
}

export async function fetchCatalogMaterials(
  supabase: SupabaseClient,
  params: FetchCatalogMaterialsParams
): Promise<CatalogMaterial[]> {
  let query = supabase.from('stock_catalog_materials').select('*')

  if (params.search) {
    query = query.ilike('name', `%${params.search}%`)
  }
  if (params.categoryId) {
    query = query.eq('category_id', params.categoryId)
  }

  const { data, error } = await query.order('name').range(params.from, params.to)

  if (error || !data) return []
  return data as unknown as CatalogMaterial[]
}
```

- [ ] **Step 4: Correr o teste e confirmar sucesso**

Run: `cd mobile && npx jest lib/catalog.test.ts`
Expected: PASS (todos os 6 testes)

- [ ] **Step 5: Correr toda a suite mobile**

Run: `cd mobile && npx jest`
Expected: PASS em tudo (nenhuma regressão)

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/catalog.ts mobile/lib/catalog.test.ts
git commit -m "feat(mobile): fetch de categorias e materiais do catalogo"
```

---

### Task 2: `CategoryChips` (componente de filtro de categoria)

**Files:**
- Create: `mobile/components/CategoryChips.tsx`
- Create: `mobile/components/CategoryChips.test.tsx`

- [ ] **Step 1: Escrever o teste que falha primeiro**

```tsx
// mobile/components/CategoryChips.test.tsx
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
```

- [ ] **Step 2: Correr e confirmar falha**

Run: `cd mobile && npx jest components/CategoryChips.test.tsx`
Expected: FAIL, `Cannot find module './CategoryChips'`

- [ ] **Step 3: Implementar**

```tsx
// mobile/components/CategoryChips.tsx
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native'
import type { StockCategory } from '../lib/catalog'

export function CategoryChips({
  categories,
  selectedId,
  onSelect,
}: {
  categories: StockCategory[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Pressable
        onPress={() => onSelect(null)}
        style={[styles.chip, selectedId === null && styles.chipActive]}
        accessibilityRole="button"
      >
        <Text style={[styles.chipText, selectedId === null && styles.chipTextActive]}>Todas</Text>
      </Pressable>
      {categories.map(category => (
        <Pressable
          key={category.id}
          onPress={() => onSelect(category.id)}
          style={[styles.chip, selectedId === category.id && styles.chipActive]}
          accessibilityRole="button"
        >
          <Text style={[styles.chipText, selectedId === category.id && styles.chipTextActive]}>
            {category.name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 4, backgroundColor: '#fafaf9', borderWidth: 1, borderColor: '#e7e5e4' },
  chipActive: { backgroundColor: '#111111', borderColor: '#111111' },
  chipText: { fontSize: 12, color: '#78716c', fontWeight: '500' },
  chipTextActive: { color: '#ffffff' },
})
```

- [ ] **Step 4: Correr e confirmar sucesso**

Run: `cd mobile && npx jest components/CategoryChips.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/components/CategoryChips.tsx mobile/components/CategoryChips.test.tsx
git commit -m "feat(mobile): componente de chips de categoria"
```

---

### Task 3: `MaterialCard` (componente de card de produto)

**Files:**
- Create: `mobile/components/MaterialCard.tsx`
- Create: `mobile/components/MaterialCard.test.tsx`

- [ ] **Step 1: Escrever o teste que falha primeiro**

```tsx
// mobile/components/MaterialCard.test.tsx
import { describe, it, expect } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { MaterialCard } from './MaterialCard'
import type { CatalogMaterial } from '../lib/catalog'

const baseMaterial: CatalogMaterial = {
  id: 'm1',
  name: 'Coluna JBL',
  description: 'Coluna ativa 500W',
  category_id: 'c1',
  unit: 'un',
  photo_url: null,
  available: true,
}

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
})
```

- [ ] **Step 2: Correr e confirmar falha**

Run: `cd mobile && npx jest components/MaterialCard.test.tsx`
Expected: FAIL, `Cannot find module './MaterialCard'`

- [ ] **Step 3: Implementar**

```tsx
// mobile/components/MaterialCard.tsx
import { View, Text, Image, StyleSheet } from 'react-native'
import type { CatalogMaterial } from '../lib/catalog'

export function MaterialCard({
  material,
  categoryName,
}: {
  material: CatalogMaterial
  categoryName: string
}) {
  return (
    <View style={styles.card}>
      {material.photo_url ? (
        <Image source={{ uri: material.photo_url }} style={styles.image} />
      ) : (
        <View testID="material-card-image-placeholder" style={styles.placeholder} />
      )}
      <View style={styles.content}>
        <Text style={styles.category}>{categoryName}</Text>
        <Text style={styles.name} numberOfLines={2}>{material.name}</Text>
        <View style={[styles.badge, material.available ? styles.badgeAvailable : styles.badgeUnavailable]}>
          <Text style={[styles.badgeText, material.available ? styles.badgeTextAvailable : styles.badgeTextUnavailable]}>
            {material.available ? 'Disponível' : 'Sob consulta'}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: '#fafaf9', borderWidth: 1, borderColor: '#f5f5f4', borderRadius: 6, overflow: 'hidden', margin: 6 },
  image: { width: '100%', height: 120 },
  placeholder: { width: '100%', height: 120, backgroundColor: '#e7e5e4' },
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

Run: `cd mobile && npx jest components/MaterialCard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/components/MaterialCard.tsx mobile/components/MaterialCard.test.tsx
git commit -m "feat(mobile): componente de card de material"
```

---

### Task 4: Tab Catálogo com grid real

**Files:**
- Modify: `mobile/app/(tabs)/catalogo.tsx`
- Create: `mobile/__tests__/app/(tabs)/catalogo.test.tsx`

- [ ] **Step 1: Escrever o teste que falha primeiro**

```tsx
// mobile/__tests__/app/(tabs)/catalogo.test.tsx
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
```

- [ ] **Step 2: Correr e confirmar falha**

Run: `cd mobile && npx jest "__tests__/app/(tabs)/catalogo.test.tsx"`
Expected: FAIL (o placeholder atual não bate com as asserções; nenhuma chamada a `fetchCatalogMaterials`)

- [ ] **Step 3: Implementar**

```tsx
// mobile/app/(tabs)/catalogo.tsx
import { useCallback, useEffect, useState } from 'react'
import { View, Text, TextInput, FlatList, StyleSheet } from 'react-native'
import { supabase } from '../../lib/supabase'
import { fetchCategories, fetchCatalogMaterials, type StockCategory, type CatalogMaterial } from '../../lib/catalog'
import { CategoryChips } from '../../components/CategoryChips'
import { MaterialCard } from '../../components/MaterialCard'

const PAGE_SIZE = 20

export default function CatalogoScreen() {
  const [categories, setCategories] = useState<StockCategory[]>([])
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [materials, setMaterials] = useState<CatalogMaterial[] | null>(null)
  const [page, setPage] = useState(0)

  useEffect(() => {
    fetchCategories(supabase).then(setCategories)
  }, [])

  const categoryNames = new Map(categories.map(c => [c.id, c.name]))

  const loadPage = useCallback((pageToLoad: number, replace: boolean) => {
    const from = pageToLoad * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    fetchCatalogMaterials(supabase, {
      search: search || undefined,
      categoryId: categoryId ?? undefined,
      from,
      to,
    }).then(results => {
      setMaterials(prev => (replace || !prev ? results : [...prev, ...results]))
    })
  }, [search, categoryId])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(0)
      loadPage(0, true)
    }, 300)
    return () => clearTimeout(timeout)
  }, [search, categoryId, loadPage])

  function handleEndReached() {
    const nextPage = page + 1
    setPage(nextPage)
    loadPage(nextPage, false)
  }

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Pesquisar material..."
        placeholderTextColor="#a8a29e"
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />
      <CategoryChips categories={categories} selectedId={categoryId} onSelect={setCategoryId} />

      {materials && materials.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nenhum material encontrado.</Text>
        </View>
      ) : (
        <FlatList
          data={materials ?? []}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <MaterialCard
              material={item}
              categoryName={item.category_id ? (categoryNames.get(item.category_id) ?? 'Outros') : 'Outros'}
            />
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  search: { margin: 16, marginBottom: 8, borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 4, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1c1917' },
  grid: { paddingHorizontal: 10, paddingBottom: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#78716c', fontSize: 14 },
})
```

- [ ] **Step 4: Correr e confirmar sucesso**

Run: `cd mobile && npx jest "__tests__/app/(tabs)/catalogo.test.tsx"`
Expected: PASS

- [ ] **Step 5: Correr toda a suite mobile**

Run: `cd mobile && npx jest`
Expected: PASS em tudo

- [ ] **Step 6: Verificar que o bundle continua a exportar (regra crítica deste projeto)**

Run: `cd mobile && npx expo export --platform ios`
Expected: sucesso, sem erros de `Unable to resolve module console` (isto confirmaria que o teste ficou corretamente fora de `mobile/app/`)

Depois: `rm -rf mobile/dist` (limpar artefacto, não commitar)

- [ ] **Step 7: Commit**

```bash
git add "mobile/app/(tabs)/catalogo.tsx" "mobile/__tests__/app/(tabs)/catalogo.test.tsx"
git commit -m "feat(mobile): tab catalogo com grid real de produtos"
```

---

### Task 5: Verificação manual completa

**Files:** nenhum (checkpoint manual)

- [ ] **Step 1: Arrancar a app**

Run: `cd mobile && npx expo start`. Abrir no Expo Go ou simulador.

- [ ] **Step 2: Confirmar o catálogo**

- Tab Catálogo mostra grid de 2 colunas com materiais reais (os que já estão marcados `is_public = true` e `active = true` na BD partilhada).
- Pesquisar por nome filtra a lista após ~300ms.
- Tocar numa categoria filtra a lista; "Todas" remove o filtro.
- Scroll até ao fim carrega mais itens (se houver mais de 20).
- Materiais sem stock disponível mostram badge "Sob consulta" em vez de "Disponível".

- [ ] **Step 3: Confirmar consistência com o site**

Comparar com `/stock` no site público: os mesmos materiais visíveis devem aparecer em ambos (mesma view, mesma RLS).

---

## Fora de escopo (relembrando do spec)

Carrinho, submissão de pedido de orçamento, ecrã de detalhe de produto, pull-to-refresh, alterações à view ou RLS existentes.
