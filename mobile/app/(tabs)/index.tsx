import { useEffect, useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { supabase } from '../../lib/supabase'
import { fetchPublicEvents, type PublicEvent } from '../../lib/events'
import { EventCard } from '../../components/EventCard'
import { BannerHeader } from '../../components/BannerHeader'

function Header() {
  return (
    <>
      <BannerHeader source={require('../../assets/banners/tickets.png')} />
      <Text style={styles.sectionTitle}>Próximos Eventos</Text>
    </>
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
  list: { paddingBottom: 16 },
  empty: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#78716c', fontSize: 14 },
  sectionTitle: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#1c1917',
    marginTop: -8,
    paddingVertical: 24,
  },
})
