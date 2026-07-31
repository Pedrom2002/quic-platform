import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../lib/theme'

export function PlaceholderScreen({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{title.toUpperCase()}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', gap: 8 },
  label: { fontSize: 11, letterSpacing: 3, color: colors.gray400, fontWeight: '600' },
  message: { fontSize: 14, color: colors.gray600 },
})
