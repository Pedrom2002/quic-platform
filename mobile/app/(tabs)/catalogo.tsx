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
