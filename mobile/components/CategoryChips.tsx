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
