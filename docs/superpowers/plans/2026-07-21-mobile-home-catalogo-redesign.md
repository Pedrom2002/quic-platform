# App mobile Quic: redesign visual Home + Catálogo com animações Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar `EventCard` (Home) e `MaterialCard`/`CategoryChips` (Catálogo) para um visual mais moderno (imagem full-bleed com gradiente, cantos mais arredondados, pills), com animações de entrada em cascata via `react-native-reanimated`, e um estado de loading visível (skeleton com shimmer) no Catálogo.

**Architecture:** `react-native-reanimated` 4.5.0 e `expo-linear-gradient` já instalados (Expo SDK 57, New Architecture sempre ativa, compatível sem configuração Babel adicional). Cada `FlatList` passa o `index` do item ao `renderItem`, que envolve o card num `Animated.View` com `entering={FadeIn...delay(index * N)}`. Um novo componente `MaterialCardSkeleton` substitui o ecrã vazio enquanto o catálogo carrega.

**Tech Stack:** Expo Router, `react-native-reanimated` 4.5.0, `expo-linear-gradient`, Jest + `@testing-library/react-native`.

---

## Nota sobre localização de testes (regra crítica deste projeto, repetida várias vezes)

Ficheiros `.test.tsx` que testam ecrãs sob `mobile/app/` NUNCA vivem dentro de `mobile/app/`. Os testes deste plano ficam em `mobile/components/` (ao lado dos componentes, padrão já usado por `EventCard.test.tsx`/`MaterialCard.test.tsx`) e `mobile/__tests__/app/(tabs)/`.

## Nota sobre dependências já instaladas

`react-native-reanimated@4.5.0` e `expo-linear-gradient` já foram instalados via `npx expo install react-native-reanimated expo-linear-gradient` (Expo SDK 57 usa New Architecture sempre ativa, é a versão correta, sem necessidade de plugin Babel manual — `babel-preset-expo` já trata disto). Confirma no `mobile/package.json:` que ambos aparecem nas `dependencies` antes de começar a Task 1; se não aparecerem, corre o comando acima primeiro.

---

### Task 1: `EventCard` redesenhado (imagem full-bleed + gradiente + animação)

**Files:**
- Modify: `mobile/components/EventCard.tsx`
- Modify: `mobile/components/EventCard.test.tsx`
- Modify: `mobile/app/(tabs)/index.tsx`

- [ ] **Step 1: Ler o componente atual antes de o substituir**

Ficheiro atual (`mobile/components/EventCard.tsx`):
```tsx
import { View, Text, Image, StyleSheet } from 'react-native'
import type { PublicEvent } from '../lib/events'

function formatEventDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function EventCard({ event }: { event: PublicEvent }) {
  return (
    <View style={styles.card}>
      {event.cover_image_url ? (
        <Image source={{ uri: event.cover_image_url }} style={styles.image} />
      ) : (
        <View testID="event-card-image-placeholder" style={styles.placeholder} />
      )}
      <View style={styles.content}>
        <Text style={styles.date}>{formatEventDate(event.start_datetime)}</Text>
        <Text style={styles.name}>{event.name}</Text>
        {event.venue_name && <Text style={styles.venue}>{event.venue_name}</Text>}
        {event.min_ticket_price_cents !== null && (
          <View style={styles.ticketButton}>
            <Text style={styles.ticketButtonText}>
              {event.min_ticket_price_cents === 0 ? 'Gratuito' : 'Comprar bilhetes'}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fafaf9', borderWidth: 1, borderColor: '#f5f5f4', borderRadius: 6, overflow: 'hidden', marginBottom: 16 },
  image: { width: '100%', height: 160 },
  placeholder: { width: '100%', height: 160, backgroundColor: '#e7e5e4' },
  content: { padding: 16 },
  date: { fontSize: 11, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  name: { fontSize: 18, fontWeight: '600', color: '#1c1917' },
  venue: { fontSize: 13, color: '#78716c', marginTop: 2 },
  ticketButton: {
    marginTop: 12,
    backgroundColor: '#111111',
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ticketButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
})
```

- [ ] **Step 2: Escrever os testes que falham primeiro (substituindo o conteúdo do ficheiro de teste)**

Os testes existentes já cobrem o comportamento funcional (nome, venue, placeholder de imagem, badge de bilhete) e continuam válidos porque o texto renderizado não muda — só o layout visual. Adiciona um teste para confirmar que o texto do evento continua acessível quando sobreposto à imagem (o que muda é a estrutura JSX, não os testes). Substitui `mobile/components/EventCard.test.tsx` por:

```tsx
import { describe, it, expect } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { EventCard } from './EventCard'
import type { PublicEvent } from '../lib/events'

const baseEvent: PublicEvent = {
  id: 'e1',
  name: 'Show X',
  description: 'Um grande concerto',
  venue_name: 'Altice Arena',
  venue_address: 'Lisboa',
  start_datetime: '2026-08-01T20:00:00.000Z',
  end_datetime: '2026-08-01T23:00:00.000Z',
  cover_image_url: null,
  min_ticket_price_cents: null,
}

describe('EventCard', () => {
  it('renders name and venue', () => {
    const { getByText } = render(<EventCard event={baseEvent} />)
    expect(getByText('Show X')).toBeTruthy()
    expect(getByText('Altice Arena')).toBeTruthy()
  })

  it('shows a placeholder when there is no cover image', () => {
    const { getByTestId } = render(<EventCard event={baseEvent} />)
    expect(getByTestId('event-card-image-placeholder')).toBeTruthy()
  })

  it('renders the cover image when present', () => {
    const eventWithCover = { ...baseEvent, cover_image_url: 'https://example.com/capa.jpg' }
    const { queryByTestId } = render(<EventCard event={eventWithCover} />)
    expect(queryByTestId('event-card-image-placeholder')).toBeNull()
  })

  it('shows no ticket button when there are no ticket types', () => {
    const { queryByText } = render(<EventCard event={baseEvent} />)
    expect(queryByText('Gratuito')).toBeNull()
    expect(queryByText('Comprar bilhetes')).toBeNull()
  })

  it('shows "Gratuito" when the cheapest ticket type is free', () => {
    const freeEvent = { ...baseEvent, min_ticket_price_cents: 0 }
    const { getByText } = render(<EventCard event={freeEvent} />)
    expect(getByText('Gratuito')).toBeTruthy()
  })

  it('shows "Comprar bilhetes" when the cheapest ticket type is paid', () => {
    const paidEvent = { ...baseEvent, min_ticket_price_cents: 1000 }
    const { getByText } = render(<EventCard event={paidEvent} />)
    expect(getByText('Comprar bilhetes')).toBeTruthy()
  })

  it('still shows venue and date text when the card has a cover image and gradient overlay', () => {
    const eventWithCover = { ...baseEvent, cover_image_url: 'https://example.com/capa.jpg' }
    const { getByText } = render(<EventCard event={eventWithCover} />)
    expect(getByText('Altice Arena')).toBeTruthy()
  })
})
```

Este ficheiro é idêntico ao já existente mais um teste novo no fim — o objetivo deste passo é confirmar que os testes que já existiam continuam válidos como spec do comportamento (não vão falhar com a implementação atual, porque o texto renderizado é o mesmo; falham só depois do Step 3 se a implementação nova esconder algum texto por engano — correr agora serve de baseline).

- [ ] **Step 3: Correr os testes para confirmar que passam com a implementação atual (baseline)**

Run: `cd mobile && npx jest --runInBand "EventCard.test.tsx"`
Expected: PASS (7 testes) — confirma que o ficheiro de teste está correto antes de mudar a implementação.

- [ ] **Step 4: Implementar o redesign**

Substitui `mobile/components/EventCard.tsx` por:

```tsx
import { View, Text, Image, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { PublicEvent } from '../lib/events'

function formatEventDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
}

export function EventCard({ event }: { event: PublicEvent }) {
  return (
    <View style={styles.card}>
      {event.cover_image_url ? (
        <Image source={{ uri: event.cover_image_url }} style={styles.image} />
      ) : (
        <View testID="event-card-image-placeholder" style={styles.placeholder} />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        locations={[0.4, 1]}
        style={styles.gradient}
      />
      <View style={styles.content}>
        <Text style={styles.date}>
          {formatEventDate(event.start_datetime)}
          {event.venue_name ? ` · ${event.venue_name}` : ''}
        </Text>
        <Text style={styles.name}>{event.name}</Text>
        {event.min_ticket_price_cents !== null && (
          <View style={styles.ticketButton}>
            <Text style={styles.ticketButtonText}>
              {event.min_ticket_price_cents === 0 ? 'Gratuito' : 'Comprar bilhetes'}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, overflow: 'hidden', marginBottom: 16, height: 220 },
  image: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  placeholder: { ...StyleSheet.absoluteFillObject, backgroundColor: '#111111' },
  gradient: { ...StyleSheet.absoluteFillObject },
  content: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  date: { fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  name: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  ticketButton: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  ticketButtonText: { color: '#111111', fontSize: 12, fontWeight: '700' },
})
```

Nota: `venue_address` deixou de ser mostrado no card (só `venue_name`, combinado com a data numa só linha) — este campo continua disponível no ecrã de detalhe do evento (`mobile/app/evento/[id].tsx`), que não é alterado por este plano.

- [ ] **Step 5: Correr e confirmar sucesso**

Run: `cd mobile && npx jest --runInBand "EventCard.test.tsx"`
Expected: PASS (7 testes)

- [ ] **Step 6: Adicionar animação de entrada em cascata na Home**

Ficheiro atual (`mobile/app/(tabs)/index.tsx`):
```tsx
import { useEffect, useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { fetchPublicEvents, type PublicEvent } from '../../lib/events'
import { EventCard } from '../../components/EventCard'

export default function InicioScreen() {
  const router = useRouter()
  const [events, setEvents] = useState<PublicEvent[] | null>(null)

  useEffect(() => {
    fetchPublicEvents(supabase).then(setEvents)
  }, [])

  if (!events) return null

  if (events.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Sem eventos agendados.</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={events}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/evento/${item.id}`)} accessibilityRole="button">
          <EventCard event={item} />
        </Pressable>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  empty: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#78716c', fontSize: 14 },
})
```

Substitui por:

```tsx
import { useEffect, useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { supabase } from '../../lib/supabase'
import { fetchPublicEvents, type PublicEvent } from '../../lib/events'
import { EventCard } from '../../components/EventCard'

export default function InicioScreen() {
  const router = useRouter()
  const [events, setEvents] = useState<PublicEvent[] | null>(null)

  useEffect(() => {
    fetchPublicEvents(supabase).then(setEvents)
  }, [])

  if (!events) return null

  if (events.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Sem eventos agendados.</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={events}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
          <Pressable onPress={() => router.push(`/evento/${item.id}`)} accessibilityRole="button">
            <EventCard event={item} />
          </Pressable>
        </Animated.View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  empty: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#78716c', fontSize: 14 },
})
```

- [ ] **Step 7: Confirmar que o teste do ecrã Início continua a passar**

Run: `cd mobile && npx jest --runInBand "app/(tabs)/index.test.tsx"`
Expected: PASS — se falhar por `react-native-reanimated` não estar mockado, ver Task 3 Step 1 (o preset `jest-expo` normalmente já mocka `react-native-reanimated`; se este comando falhar aqui, resolve isso antes de continuar em vez de esperar pela Task 3).

- [ ] **Step 8: Commit**

```bash
git add mobile/components/EventCard.tsx mobile/components/EventCard.test.tsx "mobile/app/(tabs)/index.tsx"
git commit -m "feat(mobile): redesign EventCard com imagem full-bleed, gradiente e animacao de entrada"
```

---

### Task 2: `MaterialCard` e `CategoryChips` redesenhados + `MaterialCardSkeleton`

**Files:**
- Modify: `mobile/components/MaterialCard.tsx`
- Modify: `mobile/components/CategoryChips.tsx`
- Create: `mobile/components/MaterialCardSkeleton.tsx`
- Create: `mobile/components/MaterialCardSkeleton.test.tsx`
- Modify: `mobile/app/(tabs)/catalogo.tsx`
- Modify: `mobile/__tests__/app/(tabs)/catalogo.test.tsx`

- [ ] **Step 1: Atualizar `MaterialCard` (cantos mais arredondados + animação de entrada)**

Substitui `mobile/components/MaterialCard.tsx` por:

```tsx
import { View, Text, Image, StyleSheet } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import type { CatalogMaterial } from '../lib/catalog'

export function MaterialCard({
  material,
  categoryName,
  index = 0,
}: {
  material: CatalogMaterial
  categoryName: string
  index?: number
}) {
  return (
    <Animated.View entering={FadeIn.delay(index * 40).duration(300)} style={styles.card}>
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
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: '#fafaf9', borderWidth: 1, borderColor: '#f5f5f4', borderRadius: 12, overflow: 'hidden', margin: 6 },
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

`index` é opcional (default `0`) para não quebrar `mobile/components/MaterialCard.test.tsx`, que hoje chama `<MaterialCard material={...} categoryName="Som" />` sem `index`.

- [ ] **Step 2: Confirmar que o teste de `MaterialCard` continua a passar**

Run: `cd mobile && npx jest --runInBand "MaterialCard.test.tsx"`
Expected: PASS (4 testes, sem alterações no ficheiro de teste — a prop `index` é opcional)

- [ ] **Step 3: Atualizar `CategoryChips` (chips em pill)**

Em `mobile/components/CategoryChips.tsx`, altera só a StyleSheet (o JSX e a lógica não mudam):

```tsx
const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fafaf9', borderWidth: 1, borderColor: '#e7e5e4' },
  chipActive: { backgroundColor: '#111111', borderColor: '#111111' },
  chipText: { fontSize: 12, color: '#78716c', fontWeight: '500' },
  chipTextActive: { color: '#ffffff' },
})
```

(única mudança: `chip.borderRadius` de `4` para `20`)

- [ ] **Step 4: Confirmar que o teste de `CategoryChips` continua a passar**

Run: `cd mobile && npx jest --runInBand "CategoryChips.test.tsx"`
Expected: PASS

- [ ] **Step 5: Escrever o teste do novo skeleton (falha primeiro)**

Cria `mobile/components/MaterialCardSkeleton.test.tsx`:

```tsx
import { describe, it, expect } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { MaterialCardSkeleton } from './MaterialCardSkeleton'

describe('MaterialCardSkeleton', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<MaterialCardSkeleton />)
    expect(getByTestId('material-card-skeleton')).toBeTruthy()
  })
})
```

- [ ] **Step 6: Correr e confirmar falha**

Run: `cd mobile && npx jest --runInBand "MaterialCardSkeleton.test.tsx"`
Expected: FAIL, `Cannot find module './MaterialCardSkeleton'`

- [ ] **Step 7: Implementar o skeleton**

Cria `mobile/components/MaterialCardSkeleton.tsx`:

```tsx
import { useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated'

export function MaterialCardSkeleton() {
  const shimmer = useSharedValue(-1)

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1, false)
  }, [shimmer])

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmer.value * 150 }],
  }))

  return (
    <View testID="material-card-skeleton" style={styles.card}>
      <View style={styles.image}>
        <Animated.View style={[styles.shimmer, shimmerStyle]} />
      </View>
      <View style={styles.content}>
        <View style={styles.lineSmall} />
        <View style={styles.lineLarge} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: '#fafaf9', borderWidth: 1, borderColor: '#f5f5f4', borderRadius: 12, overflow: 'hidden', margin: 6 },
  image: { width: '100%', height: 120, backgroundColor: '#e7e5e4', overflow: 'hidden' },
  shimmer: { width: 80, height: '100%', backgroundColor: 'rgba(255,255,255,0.4)' },
  content: { padding: 12, gap: 8 },
  lineSmall: { height: 8, width: '40%', backgroundColor: '#e7e5e4', borderRadius: 4 },
  lineLarge: { height: 12, width: '70%', backgroundColor: '#e7e5e4', borderRadius: 4 },
})
```

- [ ] **Step 8: Correr e confirmar sucesso**

Run: `cd mobile && npx jest --runInBand "MaterialCardSkeleton.test.tsx"`
Expected: PASS

- [ ] **Step 9: Escrever o teste do estado de loading do Catálogo (falha primeiro)**

Ficheiro atual (`mobile/__tests__/app/(tabs)/catalogo.test.tsx`) já existe — vamos adicionar um caso novo, não substituir os existentes. Adiciona este `it` dentro do `describe('CatalogoScreen', ...)`, antes do `it('shows empty state...')`:

```tsx
  it('shows 6 skeleton placeholders while materials are loading', () => {
    mockFetchCatalogMaterials.mockReturnValue(new Promise(() => {}))
    const { getAllByTestId } = render(<CatalogoScreen />)

    expect(getAllByTestId('material-card-skeleton')).toHaveLength(6)
  })
```

`mockFetchCatalogMaterials.mockReturnValue(new Promise(() => {}))` cria uma promise que nunca resolve, simulando o estado "ainda a carregar" (`materials === null`) de forma síncrona e testável, sem `waitFor`.

- [ ] **Step 10: Correr e confirmar falha**

Run: `cd mobile && npx jest --runInBand "catalogo.test.tsx"`
Expected: FAIL no teste novo, `Unable to find an element with testID: material-card-skeleton` (o ecrã hoje devolve `null` enquanto `materials === null`, não renderiza nada)

- [ ] **Step 11: Implementar o skeleton no ecrã Catálogo**

Ficheiro atual (`mobile/app/(tabs)/catalogo.tsx`):
```tsx
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

  // Sem sequenciamento de pedidos: uma pagina em curso pode resolver depois de
  // um replace de pesquisa/categoria mais recente. Aceite como troca razoavel
  // para uma navegacao so de leitura (janela curta do debounce, autocorrige).
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

Substitui por (a única mudança de lógica é o novo bloco `materials === null` antes do bloco `materials.length === 0`; o `renderItem` ganha `index`):

```tsx
import { useCallback, useEffect, useState } from 'react'
import { View, Text, TextInput, FlatList, StyleSheet } from 'react-native'
import { supabase } from '../../lib/supabase'
import { fetchCategories, fetchCatalogMaterials, type StockCategory, type CatalogMaterial } from '../../lib/catalog'
import { CategoryChips } from '../../components/CategoryChips'
import { MaterialCard } from '../../components/MaterialCard'
import { MaterialCardSkeleton } from '../../components/MaterialCardSkeleton'

const PAGE_SIZE = 20
const SKELETON_COUNT = 6

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

  // Sem sequenciamento de pedidos: uma pagina em curso pode resolver depois de
  // um replace de pesquisa/categoria mais recente. Aceite como troca razoavel
  // para uma navegacao so de leitura (janela curta do debounce, autocorrige).
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

      {materials === null ? (
        <View style={styles.grid}>
          <View style={styles.skeletonRow}>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <MaterialCardSkeleton key={i} />
            ))}
          </View>
        </View>
      ) : materials.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nenhum material encontrado.</Text>
        </View>
      ) : (
        <FlatList
          data={materials}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          renderItem={({ item, index }) => (
            <MaterialCard
              material={item}
              categoryName={item.category_id ? (categoryNames.get(item.category_id) ?? 'Outros') : 'Outros'}
              index={index}
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
  skeletonRow: { flexDirection: 'row', flexWrap: 'wrap' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#78716c', fontSize: 14 },
})
```

- [ ] **Step 12: Correr e confirmar sucesso**

Run: `cd mobile && npx jest --runInBand "catalogo.test.tsx"`
Expected: PASS (3 testes: o skeleton novo + os 2 já existentes)

- [ ] **Step 13: Commit**

```bash
git add mobile/components/MaterialCard.tsx mobile/components/CategoryChips.tsx mobile/components/MaterialCardSkeleton.tsx mobile/components/MaterialCardSkeleton.test.tsx "mobile/app/(tabs)/catalogo.tsx" "mobile/__tests__/app/(tabs)/catalogo.test.tsx"
git commit -m "feat(mobile): redesign MaterialCard/CategoryChips, skeleton loading e animacao no catalogo"
```

---

### Task 3: Suite completa + export

**Files:** nenhum novo (verificação final)

- [ ] **Step 1: Correr toda a suite mobile**

Run: `cd mobile && npx jest --runInBand`
Expected: PASS em tudo. Se algum teste falhar com um erro relacionado a `react-native-reanimated` (ex: `Reanimated 2 failed to create a worklet` ou similar em ambiente de teste), isso significa que o preset `jest-expo` não está a mockar a lib automaticamente nesta versão — nesse caso, adiciona ao topo do ficheiro de teste que falhar:
```ts
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'))
```
e corre de novo. Não adiciones este mock preventivamente sem confirmar primeiro que é necessário (YAGNI) — o preset `jest-expo` do projeto (`mobile/package.json`, campo `"jest": { "preset": "jest-expo" }`) já inclui suporte a Reanimated na maioria das versões recentes.

- [ ] **Step 2: Verificar que o bundle continua a exportar**

Run: `cd mobile && npx expo export --platform ios`
Expected: sucesso, sem erros

Depois: `rm -rf mobile/dist`

- [ ] **Step 3: Verificação manual**

Run: `cd mobile && npx expo start`

- Tab Início: cards de evento com imagem grande, texto sobreposto legível, entrada em cascata ao abrir a tab (cada card aparece com um pequeno atraso em relação ao anterior).
- Tab Catálogo: ao abrir, mostra 6 blocos cinza com brilho a deslizar (skeleton) antes dos materiais reais aparecerem; depois, grid real entra com fade suave.
- Chips de categoria têm cantos totalmente arredondados (pill).

---

## Fora de escopo (relembrando do spec)

Mudanças de dados/lógica de negócio, animações de saída ou gestos, dark mode, tabs Portal/Mais.
