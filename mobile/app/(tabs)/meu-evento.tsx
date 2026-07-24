import { useEffect, useState } from 'react'
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSession } from '../../hooks/useSession'
import { resolveUserRole } from '../../lib/role'
import { supabase } from '../../lib/supabase'
import { fetchPortalData, type PortalData, type PortalItem } from '../../lib/portal'

const STATUS_LABELS: Record<string, string> = {
  completed: 'Concluído',
  in_progress: 'Em curso',
  pending: 'Pendente',
}

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
}

function ChecklistItemRow({ item }: { item: PortalItem }) {
  const label = item.client_label ?? item.title
  return (
    <View style={styles.itemRow}>
      <Text style={[styles.itemTitle, item.status === 'completed' && styles.itemTitleDone]}>{label}</Text>
      <Text style={styles.itemStatus}>{STATUS_LABELS[item.status] ?? item.status}</Text>
    </View>
  )
}

function MeuEventoContent({ data }: { data: PortalData }) {
  const insets = useSafeAreaInsets()
  const { event, items, progress } = data

  return (
    <FlatList
      data={items}
      keyExtractor={i => i.id}
      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      ListHeaderComponent={
        <View style={styles.hero}>
          <Text style={styles.label}>O MEU EVENTO</Text>
          <Text style={styles.eventName}>{event.name}</Text>
          <Text style={styles.eventMeta}>{formatEventDate(event.start_datetime)}</Text>
          {event.venue_name && <Text style={styles.eventMeta}>{event.venue_name}</Text>}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress.percent}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{progress.completed} de {progress.total} concluídas</Text>
        </View>
      }
      renderItem={({ item }) => <ChecklistItemRow item={item} />}
      ListEmptyComponent={<Text style={styles.emptyText}>Sem etapas disponíveis.</Text>}
    />
  )
}

export default function MeuEventoScreen() {
  const { session } = useSession()
  const [portalToken, setPortalToken] = useState<string | null | undefined>(undefined)
  const [data, setData] = useState<PortalData | null>(null)

  useEffect(() => {
    resolveUserRole(supabase, session).then(role => {
      setPortalToken(role.role === 'client' ? role.portalToken : null)
    })
  }, [session])

  useEffect(() => {
    if (portalToken) {
      fetchPortalData(process.env.EXPO_PUBLIC_APP_URL!, portalToken).then(setData)
    }
  }, [portalToken])

  if (portalToken === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#9333EA" />
      </View>
    )
  }

  if (!portalToken) {
    return (
      <View style={styles.center}>
        <Text style={styles.restricted}>Sem evento associado à tua conta.</Text>
      </View>
    )
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#9333EA" />
      </View>
    )
  }

  return <MeuEventoContent data={data} />
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  restricted: { color: '#57534e', fontSize: 14, textAlign: 'center' },
  hero: { backgroundColor: '#9333EA', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 28 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 3, marginBottom: 12 },
  eventName: { color: '#ffffff', fontSize: 26, fontWeight: 'bold', marginBottom: 6 },
  eventMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, marginTop: 18, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#ffffff', borderRadius: 3 },
  progressLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f4' },
  itemTitle: { fontSize: 14, color: '#1c1917', flex: 1, marginRight: 12 },
  itemTitleDone: { color: '#a8a29e', textDecorationLine: 'line-through' },
  itemStatus: { fontSize: 11, color: '#78716c', textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyText: { color: '#78716c', fontSize: 14, textAlign: 'center', padding: 24 },
})
