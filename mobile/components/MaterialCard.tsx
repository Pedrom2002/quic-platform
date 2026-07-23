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
      {material.photo_url && (
        <Image testID="material-card-image" source={{ uri: material.photo_url }} style={styles.image} resizeMode="contain" />
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
  image: { width: '100%', height: 120, backgroundColor: '#ffffff' },
  addButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#9333EA',
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
