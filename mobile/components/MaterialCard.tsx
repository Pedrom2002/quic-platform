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
