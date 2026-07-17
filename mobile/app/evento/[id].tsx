import { useEffect, useState } from 'react'
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { fetchEventById, type PublicEvent } from '../../lib/events'

function formatEventDateTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [event, setEvent] = useState<PublicEvent | null | undefined>(undefined)

  useEffect(() => {
    fetchEventById(supabase, id).then(setEvent)
  }, [id])

  if (event === undefined) return null

  if (event === null) {
    return (
      <View style={styles.notFound}>
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
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  hero: { width: '100%', height: 260 },
  heroFallback: { width: '100%', height: 260, backgroundColor: '#111111' },
  body: { padding: 20 },
  name: { fontSize: 28, fontWeight: '700', color: '#1c1917', marginBottom: 8 },
  date: { fontSize: 14, color: '#78716c', marginBottom: 4 },
  venue: { fontSize: 14, color: '#1c1917', fontWeight: '500' },
  address: { fontSize: 13, color: '#a8a29e', marginTop: 2 },
  description: { fontSize: 14, color: '#44403c', marginTop: 16, lineHeight: 20 },
  notFound: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  notFoundText: { color: '#78716c', fontSize: 14 },
})
