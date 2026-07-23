import { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { fetchMyTickets } from '../../lib/tickets'

// O webhook do Stripe cria o bilhete de forma assincrona ao confirmar o
// pagamento, o que pode chegar depois deste ecra abrir. Tenta algumas vezes
// antes de assumir que ainda esta a processar.
const POLL_ATTEMPTS = 5
const POLL_INTERVAL_MS = 1000

export default function TicketPurchaseSuccessScreen() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
        const tickets = await fetchMyTickets(supabase)
        if (cancelled) return
        if (tickets.length > 0) {
          setReady(true)
          return
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
      }
      if (!cancelled) setReady(true)
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <View style={styles.container}>
      {ready ? (
        <>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark" size={40} color="#ffffff" />
          </View>
          <Text style={styles.title}>Pagamento confirmado</Text>
          <Text style={styles.subtitle}>O teu bilhete já está disponível.</Text>
          <Pressable
            style={styles.button}
            onPress={() => router.replace('/tickets')}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Ver os meus bilhetes</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color="#9333EA" />
          <Text style={styles.subtitle}>A confirmar o teu pagamento...</Text>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#9333EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1c1917' },
  subtitle: { fontSize: 14, color: '#78716c', textAlign: 'center' },
  button: { marginTop: 16, backgroundColor: '#9333EA', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  buttonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
})
