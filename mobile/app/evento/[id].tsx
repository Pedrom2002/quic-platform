import { useEffect, useState } from 'react'
import { View, Text, Image, ScrollView, StyleSheet, Linking, Alert, ActivityIndicator } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { fetchEventById, type PublicEvent } from '../../lib/events'
import { fetchTicketTypes, createCheckoutSession, type TicketType } from '../../lib/tickets'
import { colors, QUIC_MAGENTA } from '../../lib/theme'
import { ActionRow } from '../../components/ActionRow'

function formatEventDateTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [event, setEvent] = useState<PublicEvent | null | undefined>(undefined)
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])

  useEffect(() => {
    fetchEventById(supabase, id).then(setEvent)
  }, [id])

  useEffect(() => {
    if (event) fetchTicketTypes(supabase, event.id).then(setTicketTypes)
  }, [event])

  async function openCheckout(ticketTypeId: string) {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) return
    const url = await createCheckoutSession(process.env.EXPO_PUBLIC_APP_URL!, ticketTypeId, 1, accessToken)
    if (!url) {
      Alert.alert('Erro', 'Não foi possível iniciar o pagamento. Tenta novamente.')
      return
    }
    try {
      await Linking.openURL(url)
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir a página de pagamento.')
    }
  }

  function handleBuy(ticketTypeId: string) {
    Alert.alert(
      'Ir para pagamento',
      'Vais ser redirecionado para o browser para concluir o pagamento. Depois de pagares, volta à app para veres o teu bilhete.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar', onPress: () => openCheckout(ticketTypeId) },
      ]
    )
  }

  if (event === undefined) {
    return (
      <View style={styles.notFound}>
        <ActivityIndicator color={QUIC_MAGENTA} />
      </View>
    )
  }

  if (event === null) {
    return (
      <View style={styles.notFound}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.gray200} style={styles.notFoundIcon} />
        <Text style={styles.notFoundText}>Evento não encontrado.</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      {event.cover_image_url ? (
        <Image source={{ uri: event.cover_image_url }} style={styles.hero} />
      ) : (
        <View style={styles.heroFallback} />
      )}
      <View style={styles.body}>
        <Text style={styles.name}>{event.name}</Text>
        <Text style={styles.date}>{formatEventDateTime(event.start_datetime)}</Text>
        {event.venue_name && <Text style={styles.venue}>{event.venue_name}</Text>}
        {event.venue_address && <Text style={styles.address}>{event.venue_address}</Text>}
        {event.description && <Text style={styles.description}>{event.description}</Text>}
        {ticketTypes.length > 0 && (
          <View style={styles.ticketsSection}>
            <Text style={styles.ticketsTitle}>Bilhetes</Text>
            {ticketTypes.map(tt => (
              <ActionRow
                key={tt.id}
                title={tt.name}
                onPress={() => handleBuy(tt.id)}
                right={<Text style={styles.ticketPrice}>{(tt.price_cents / 100).toFixed(2)} €</Text>}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  hero: { width: '100%', height: 260 },
  heroFallback: { width: '100%', height: 260, backgroundColor: '#111111' },
  body: { padding: 20 },
  name: { fontSize: 28, fontWeight: '700', color: colors.gray900, marginBottom: 8 },
  date: { fontSize: 14, color: colors.gray500, marginBottom: 4 },
  venue: { fontSize: 14, color: colors.gray900, fontWeight: '500' },
  address: { fontSize: 13, color: colors.gray400, marginTop: 2 },
  description: { fontSize: 14, color: colors.gray700, marginTop: 16, lineHeight: 20 },
  notFound: { flex: 1, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  notFoundIcon: { marginBottom: 8 },
  notFoundText: { color: colors.gray500, fontSize: 14 },
  ticketsSection: { marginTop: 24, gap: 8 },
  ticketsTitle: { fontSize: 16, fontWeight: '700', color: colors.gray900, marginBottom: 4 },
  ticketPrice: { fontSize: 14, color: colors.gray500 },
})
