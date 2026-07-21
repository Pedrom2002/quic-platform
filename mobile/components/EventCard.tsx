import { View, Text, Image, StyleSheet } from 'react-native'
import type { PublicEvent } from '../lib/events'

function formatEventDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function EventCard({ event }: { event: PublicEvent }) {
  return (
    <View style={styles.card}>
      {event.cover_image_url ? (
        <Image source={{ uri: event.cover_image_url }} style={styles.image} />
      ) : (
        <View testID="event-card-image-placeholder" style={styles.placeholder} />
      )}
      <View style={styles.content}>
        <Text style={styles.date}>{formatEventDate(event.start_datetime)}</Text>
        <Text style={styles.name}>{event.name}</Text>
        {event.venue_name && <Text style={styles.venue}>{event.venue_name}</Text>}
        {event.min_ticket_price_cents !== null && (
          <View style={styles.ticketButton}>
            <Text style={styles.ticketButtonText}>
              {event.min_ticket_price_cents === 0 ? 'Gratuito' : 'Comprar bilhetes'}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fafaf9', borderWidth: 1, borderColor: '#f5f5f4', borderRadius: 6, overflow: 'hidden', marginBottom: 16 },
  image: { width: '100%', height: 160 },
  placeholder: { width: '100%', height: 160, backgroundColor: '#e7e5e4' },
  content: { padding: 16 },
  date: { fontSize: 11, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  name: { fontSize: 18, fontWeight: '600', color: '#1c1917' },
  venue: { fontSize: 13, color: '#78716c', marginTop: 2 },
  ticketButton: {
    marginTop: 12,
    backgroundColor: '#111111',
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ticketButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
})
