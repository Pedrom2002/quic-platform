import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { fetchPublicEvents, type PublicEvent } from '../../lib/events'
import { EventCard } from '../../components/EventCard'

export default function InicioScreen() {
  const router = useRouter()
  const [events, setEvents] = useState<PublicEvent[] | null>(null)

  useEffect(() => {
    fetchPublicEvents(supabase).then(setEvents)
  }, [])

  if (!events) return null

  if (events.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Sem eventos agendados.</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={events}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View onTouchEnd={() => router.push(`/evento/${item.id}`)}>
          <EventCard event={item} />
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  empty: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#78716c', fontSize: 14 },
})
