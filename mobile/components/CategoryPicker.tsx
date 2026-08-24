import { useState } from 'react'
import { Modal, Pressable, Text, View, FlatList, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { StockCategory } from '../lib/catalog'
import { QUIC_MAGENTA, colors } from '../lib/theme'

type PickerItem = { id: string | null; name: string }

export function CategoryPicker({
  categories,
  selectedId,
  onSelect,
}: {
  categories: StockCategory[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const insets = useSafeAreaInsets()
  const [visible, setVisible] = useState(false)
  const items: PickerItem[] = [{ id: null, name: 'Todas' }, ...categories]
  const selectedName = selectedId
    ? (categories.find(c => c.id === selectedId)?.name ?? 'Categorias')
    : 'Categorias'

  function handleSelect(id: string | null) {
    onSelect(id)
    setVisible(false)
  }

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
        accessibilityRole="button"
        accessibilityLabel="Escolher categoria"
      >
        <Ionicons name="options-outline" size={16} color={colors.gray700} />
        <Text style={styles.triggerText}>{selectedName}</Text>
      </Pressable>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Categorias</Text>
              <Pressable
                onPress={() => setVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={colors.gray900} />
              </Pressable>
            </View>
            <FlatList
              data={items}
              keyExtractor={item => item.id ?? 'all'}
              numColumns={2}
              contentContainerStyle={styles.grid}
              renderItem={({ item }) => {
                const active = selectedId === item.id
                return (
                  <Pressable
                    onPress={() => handleSelect(item.id)}
                    style={({ pressed }) => [
                      styles.gridItem,
                      active && styles.gridItemActive,
                      pressed && !active && styles.gridItemPressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.gridItemText, active && styles.gridItemTextActive]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </Pressable>
                )
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.gray100,
  },
  triggerPressed: { backgroundColor: colors.gray200 },
  triggerText: { fontSize: 13, color: colors.gray700, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.gray900 },
  grid: { paddingHorizontal: 16, gap: 10, paddingBottom: 8 },
  gridItem: {
    flex: 1,
    height: 52,
    margin: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.gray100,
    paddingHorizontal: 8,
  },
  gridItemActive: { backgroundColor: QUIC_MAGENTA },
  gridItemPressed: { backgroundColor: colors.gray200 },
  gridItemText: { fontSize: 13, color: colors.gray700, fontWeight: '600' },
  gridItemTextActive: { color: colors.white },
})
