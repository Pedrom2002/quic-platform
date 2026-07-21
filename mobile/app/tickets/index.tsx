import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { supabase } from '../../lib/supabase'
import { fetchMyTickets, type MyTicket } from '../../lib/tickets'

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
  emptyText: { color: '#78716c', fontSize: 14 },
  card: { backgroundColor: '#fafaf9', borderWidth: 1, borderColor: '#f5f5f4', borderRadius: 6, padding: 20, alignItems: 'center', gap: 12, marginBottom: 12 },
  status: { fontSize: 12, color: '#78716c', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
})
