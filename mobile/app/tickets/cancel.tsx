import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { QUIC_MAGENTA, colors } from '../../lib/theme'

export default function TicketPurchaseCancelScreen() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, styles.iconCircleCancel]}>
        <Ionicons name="close" size={40} color={colors.white} />
      </View>
      <Text style={styles.title}>Pagamento cancelado</Text>
      <Text style={styles.subtitle}>Não foi efetuado nenhum débito. Podes tentar novamente quando quiseres.</Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={() => router.replace('/(tabs)')}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Voltar aos eventos</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: QUIC_MAGENTA,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircleCancel: { backgroundColor: colors.gray400 },
  title: { fontSize: 20, fontWeight: '700', color: colors.gray900 },
  subtitle: { fontSize: 14, color: colors.gray500, textAlign: 'center' },
  button: { marginTop: 16, backgroundColor: QUIC_MAGENTA, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
})
