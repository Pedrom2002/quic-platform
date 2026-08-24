import type { ReactNode } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../lib/theme'

export function ActionRow({
  title,
  subtitle,
  onPress,
  right,
  accessibilityRole = 'button',
}: {
  title: string
  subtitle?: string
  onPress: () => void
  right?: ReactNode
  accessibilityRole?: 'button' | 'link'
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={title}
    >
      <View style={styles.textBlock}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={18} color={colors.gray300} />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray100,
    borderRadius: 6,
    padding: 14,
  },
  rowPressed: { backgroundColor: colors.gray100 },
  textBlock: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: '600', color: colors.gray900 },
  subtitle: { fontSize: 12, color: colors.gray500 },
})
