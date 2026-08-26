import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, QUIC_MAGENTA } from '../lib/theme'

export function AppErrorFallback({ resetError }: { resetError: () => void }) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.gray300} />
      <Text style={styles.title}>Algo correu mal</Text>
      <Text style={styles.body}>
        Ocorreu um erro inesperado. Tenta novamente; se o problema persistir, fecha e reabre a app.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={resetError}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Tentar novamente</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: colors.gray900 },
  body: { fontSize: 14, color: colors.gray500, textAlign: 'center', lineHeight: 20 },
  button: { marginTop: 12, backgroundColor: QUIC_MAGENTA, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: colors.white, fontSize: 14, fontWeight: '700' },
})
