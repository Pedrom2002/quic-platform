import { useEffect, useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { fetchPublicEvents, type PublicEvent } from '../../lib/events'
import { EventCard } from '../../components/EventCard'
import { BannerHeader } from '../../components/BannerHeader'
import { colors, QUIC_MAGENTA } from '../../lib/theme'

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

  if (!events) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator color={QUIC_MAGENTA} />
      </View>
    )
  }

  if (events.length === 0) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={48} color={colors.gray200} style={styles.emptyIcon} />
          <Text style={styles.emptyText}>Sem eventos agendados.</Text>
        </View>
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
  container: { flex: 1, backgroundColor: colors.white },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { marginTop: 24, marginBottom: 8 },
  emptyText: { color: colors.gray500, fontSize: 14 },
  sectionTitle: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.gray900,
    marginTop: -8,
    paddingVertical: 24,
  },
})
