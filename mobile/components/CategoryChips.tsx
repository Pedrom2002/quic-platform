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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={styles.row}
    >
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
  scrollView: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f0efee' },
  chipActive: { backgroundColor: '#111111' },
  chipText: { fontSize: 13, color: '#44403c', fontWeight: '600' },
  chipTextActive: { color: '#ffffff' },
})
