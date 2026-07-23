import { useCallback, useEffect, useState } from 'react'
import { View, Text, TextInput, FlatList, StyleSheet, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { fetchCategories, fetchCatalogMaterials, type StockCategory, type CatalogMaterial } from '../../lib/catalog'
import { CategoryPicker } from '../../components/CategoryPicker'
import { MaterialCard } from '../../components/MaterialCard'
import { MaterialCardSkeleton } from '../../components/MaterialCardSkeleton'
import { useCart } from '../../hooks/useCart'

const PAGE_SIZE = 20
const SKELETON_COUNT = 6

export default function CatalogoScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { items } = useCart()
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0)
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
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Catálogo</Text>
        <Text style={styles.subtitle}>Material disponível para o teu evento</Text>
      </View>

      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color="#a8a29e" style={styles.searchIcon} />
        <TextInput
          placeholder="Pesquisar material..."
          placeholderTextColor="#a8a29e"
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />
      </View>
      <CategoryPicker categories={categories} selectedId={categoryId} onSelect={setCategoryId} />

      {materials === null ? (
        <FlatList
          data={Array.from({ length: SKELETON_COUNT }, (_, i) => i)}
          keyExtractor={i => `skeleton-${i}`}
          numColumns={2}
          scrollEnabled={false}
          contentContainerStyle={styles.grid}
          renderItem={() => <MaterialCardSkeleton />}
        />
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

      {totalQty > 0 && (
        <Pressable
          style={styles.fab}
          onPress={() => router.push('/pedido')}
          accessibilityRole="button"
        >
          <Text style={styles.fabText}>Pedir orçamento ({totalQty})</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#1c1917' },
  subtitle: { fontSize: 13, color: '#78716c', marginTop: 2 },
  searchWrapper: { marginHorizontal: 16, marginBottom: 8, position: 'relative', justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 14, zIndex: 1 },
  search: {
    backgroundColor: '#f5f5f4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingLeft: 40,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1c1917',
  },
  grid: { paddingHorizontal: 10, paddingBottom: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#78716c', fontSize: 14 },
  fab: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: '#9333EA',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  fabText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
})
