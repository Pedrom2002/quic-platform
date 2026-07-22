import { FlatList, Pressable, Text, StyleSheet } from 'react-native'
import type { StockCategory } from '../lib/catalog'

type ChipItem = { id: string | null; name: string }

export function CategoryChips({
  categories,
  selectedId,
  onSelect,
}: {
  categories: StockCategory[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const items: ChipItem[] = [{ id: null, name: 'Todas' }, ...categories]

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={items}
      keyExtractor={item => item.id ?? 'all'}
      style={styles.list}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => {
        const active = selectedId === item.id
        return (
          <Pressable
            onPress={() => onSelect(item.id)}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
          </Pressable>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  list: { flexGrow: 0, maxHeight: 56 },
  content: { alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  chip: {
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 19,
    backgroundColor: '#f0efee',
  },
  chipActive: { backgroundColor: '#111111' },
  chipText: { fontSize: 13, color: '#44403c', fontWeight: '600' },
  chipTextActive: { color: '#ffffff' },
})
