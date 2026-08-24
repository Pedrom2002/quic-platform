import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { fetchMyTickets, type MyTicket } from '../../lib/tickets'
import { colors, QUIC_MAGENTA } from '../../lib/theme'
import { BannerHeader } from '../../components/BannerHeader'

const STATUS_LABELS: Record<string, string> = {
  valid: 'Válido',
  used: 'Utilizado',
  refunded: 'Reembolsado',
}

function formatTicketDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Header() {
  return <BannerHeader source={require('../../assets/banners/tickets.png')} />
}

export default function MyTicketsScreen() {
  const [tickets, setTickets] = useState<MyTicket[] | null>(null)

  useEffect(() => {
    fetchMyTickets(supabase).then(setTickets)
  }, [])

  if (!tickets) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator color={QUIC_MAGENTA} />
      </View>
    )
  }

  if (tickets.length === 0) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.empty}>
          <Ionicons name="ticket-outline" size={48} color={colors.gray200} style={styles.emptyIcon} />
          <Text style={styles.emptyText}>Ainda não tens bilhetes.</Text>
        </View>
      </View>
    )
  }

  return (
    <FlatList
      data={tickets}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={Header}
      renderItem={({ item }) => (
        <View style={styles.card}>
          {item.event_name && <Text style={styles.eventName}>{item.event_name}</Text>}
          {item.event_start_datetime && (
            <Text style={styles.eventDate}>{formatTicketDate(item.event_start_datetime)}</Text>
          )}
          <QRCode value={item.qr_code} size={160} />
          <Text style={styles.status}>{STATUS_LABELS[item.status] ?? item.status}</Text>
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: { paddingBottom: 16, gap: 12 },
  container: { flex: 1, backgroundColor: colors.white },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { marginTop: 24, marginBottom: 8 },
  emptyText: { color: colors.gray500, fontSize: 14 },
  card: { backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray100, borderRadius: 6, padding: 20, alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 12 },
  eventName: { fontSize: 16, fontWeight: '700', color: colors.gray900, textAlign: 'center' },
  eventDate: { fontSize: 12, color: colors.gray500, marginTop: -8 },
  status: { fontSize: 12, color: colors.gray500, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
})
