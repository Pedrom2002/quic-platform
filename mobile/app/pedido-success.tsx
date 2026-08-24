import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { QUIC_MAGENTA, colors } from '../lib/theme'

export default function PedidoSuccessScreen() {
  const router = useRouter()
  const { email } = useLocalSearchParams<{ email?: string }>()

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="checkmark" size={40} color={colors.white} />
      </View>
      <Text style={styles.title}>Pedido enviado</Text>
      <Text style={styles.subtitle}>
        Respondemos com um orçamento sem compromisso{email ? ` para ${email}` : ''}.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={() => router.replace('/(tabs)/catalogo')}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Voltar ao catálogo</Text>
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
  title: { fontSize: 20, fontWeight: '700', color: colors.gray900 },
  subtitle: { fontSize: 14, color: colors.gray500, textAlign: 'center' },
  button: { marginTop: 16, backgroundColor: QUIC_MAGENTA, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
})
