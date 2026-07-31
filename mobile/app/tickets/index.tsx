import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { supabase } from '../../lib/supabase'
import { fetchMyTickets, type MyTicket } from '../../lib/tickets'
import { colors } from '../../lib/theme'

const STATUS_LABELS: Record<string, string> = {
  valid: 'Válido',
  used: 'Utilizado',
  refunded: 'Reembolsado',
}

export default function MyTicketsScreen() {
  const [tickets, setTickets] = useState<MyTicket[] | null>(null)

  useEffect(() => {
    fetchMyTickets(supabase).then(setTickets)
  }, [])

  if (!tickets) return null

  if (tickets.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Ainda não tens bilhetes.</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={tickets}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <QRCode value={item.qr_code} size={160} />
          <Text style={styles.status}>{STATUS_LABELS[item.status] ?? item.status}</Text>
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  empty: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.gray500, fontSize: 14 },
  card: { backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray100, borderRadius: 6, padding: 20, alignItems: 'center', gap: 12, marginBottom: 12 },
  status: { fontSize: 12, color: colors.gray500, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
})
