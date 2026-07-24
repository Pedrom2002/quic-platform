import { useEffect, useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { supabase } from '../../lib/supabase'
import { fetchPublicEvents, type PublicEvent } from '../../lib/events'
import { EventCard } from '../../components/EventCard'

function Header() {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.title}>Próximos eventos</Text>
    </View>
  )
}

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
        <Header />
        <Text style={styles.emptyText}>Sem eventos agendados.</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={events}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={Header}
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 80).duration(400)}>
          <Pressable onPress={() => router.push(`/evento/${item.id}`)} accessibilityRole="button">
            <EventCard event={item} />
          </Pressable>
        </Animated.View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  header: { paddingHorizontal: 4, paddingBottom: 16 },
  title: {
    fontSize: 27,
    fontWeight: '700',
    color: '#1c1917',
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
  },
  empty: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#78716c', fontSize: 14 },
})
