import { View, Text, Image, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { PublicEvent } from '../lib/events'
import { QUIC_MAGENTA } from '../lib/theme'

function formatEventDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
}

export function EventCard({ event }: { event: PublicEvent }) {
  return (
    <View style={styles.card}>
      {event.cover_image_url ? (
        <Image source={{ uri: event.cover_image_url }} style={styles.image} />
      ) : (
        <View testID="event-card-image-placeholder" style={styles.placeholder} />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        locations={[0.4, 1]}
        style={styles.gradient}
      />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.date} numberOfLines={1}>
            {formatEventDate(event.start_datetime)}
            {event.venue_name ? ` · ${event.venue_name}` : ''}
          </Text>
          {event.min_ticket_price_cents !== null && event.min_ticket_price_cents > 0 && (
            <Text style={styles.price}>
              Desde {(event.min_ticket_price_cents / 100).toFixed(2)} €
            </Text>
          )}
        </View>
        <Text style={styles.name} numberOfLines={2}>{event.name}</Text>
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

const fill = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 }

const styles = StyleSheet.create({
  card: { borderRadius: 14, overflow: 'hidden', marginHorizontal: 16, marginBottom: 16, height: 220 },
  image: { ...fill, width: '100%', height: '100%' },
  placeholder: { ...fill, backgroundColor: '#111111' },
  gradient: { ...fill },
  content: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  date: { flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 },
  price: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  name: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  ticketButton: {
    marginTop: 8,
    backgroundColor: QUIC_MAGENTA,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  ticketButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
})
