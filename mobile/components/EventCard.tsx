import { View, Text, Image, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { PublicEvent } from '../lib/events'

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
        <Text style={styles.date}>
          {formatEventDate(event.start_datetime)}
          {event.venue_name ? ` · ${event.venue_name}` : ''}
        </Text>
        <Text style={styles.name}>{event.name}</Text>
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
  card: { borderRadius: 14, overflow: 'hidden', marginBottom: 16, height: 220 },
  image: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  placeholder: { ...StyleSheet.absoluteFillObject, backgroundColor: '#111111' },
  gradient: { ...StyleSheet.absoluteFillObject },
  content: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  date: { fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  name: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  ticketButton: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  ticketButtonText: { color: '#111111', fontSize: 12, fontWeight: '700' },
})
