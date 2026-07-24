import { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { fetchTicketsBySession } from '../../lib/tickets'

// O webhook do Stripe cria o bilhete de forma assincrona ao confirmar o
// pagamento, o que pode chegar depois deste ecra abrir. Tenta algumas vezes
// antes de assumir que ainda esta a processar.
const POLL_ATTEMPTS = 5
const POLL_INTERVAL_MS = 1000

type ScreenState = 'loading' | 'confirmed' | 'pending' | 'error'

export default function TicketPurchaseSuccessScreen() {
  const router = useRouter()
  const { session_id: sessionId } = useLocalSearchParams<{ session_id?: string }>()
  const [state, setState] = useState<ScreenState>('loading')

  useEffect(() => {
    let cancelled = false

    if (!sessionId) {
      setState('error')
      return
    }

    async function poll() {
      for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
        const result = await fetchTicketsBySession(supabase, sessionId as string)
        if (cancelled) return
        if (result.error) {
          setState('error')
          return
        }
        if (result.tickets.length > 0) {
          setState('confirmed')
          return
        }
        if (attempt < POLL_ATTEMPTS - 1) {
          await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
        }
      }
      if (!cancelled) setState('pending')
    }

    poll().catch(() => {
      if (!cancelled) setState('error')
    })

    return () => {
      cancelled = true
    }
  }, [sessionId])

  return (
    <View style={styles.container}>
      {state === 'confirmed' && (
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
      )}

      {state === 'pending' && (
        <>
          <View style={[styles.iconCircle, styles.iconCirclePending]}>
            <Ionicons name="time-outline" size={40} color="#ffffff" />
          </View>
          <Text style={styles.title}>Ainda a processar</Text>
          <Text style={styles.subtitle}>O pagamento foi recebido, mas o bilhete ainda está a ser criado. Verifica novamente daqui a pouco.</Text>
          <Pressable
            style={styles.button}
            onPress={() => router.replace('/tickets')}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Ver os meus bilhetes</Text>
          </Pressable>
        </>
      )}

      {state === 'error' && (
        <>
          <View style={[styles.iconCircle, styles.iconCircleError]}>
            <Ionicons name="alert" size={40} color="#ffffff" />
          </View>
          <Text style={styles.title}>Não foi possível confirmar</Text>
          <Text style={styles.subtitle}>Verifica a tua ligação e consulta os teus bilhetes.</Text>
          <Pressable
            style={styles.button}
            onPress={() => router.replace('/tickets')}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Ver os meus bilhetes</Text>
          </Pressable>
        </>
      )}

      {state === 'loading' && (
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
  iconCirclePending: { backgroundColor: '#d97706' },
  iconCircleError: { backgroundColor: '#b91c1c' },
  title: { fontSize: 20, fontWeight: '700', color: '#1c1917' },
  subtitle: { fontSize: 14, color: '#78716c', textAlign: 'center' },
  button: { marginTop: 16, backgroundColor: '#9333EA', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  buttonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
})
