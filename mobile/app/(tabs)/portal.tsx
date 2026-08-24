import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, FlatList, Pressable, Linking, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { BannerHeader } from '../../components/BannerHeader'
import { useSession } from '../../hooks/useSession'
import { displayArtistName } from '../../lib/artistName'
import { resolveUserRole, type UserRole } from '../../lib/role'
import { supabase } from '../../lib/supabase'
import { fetchArtistPortalData, type ArtistPortalData, type ArtistAgendaItem, type ArtistClipping, type ArtistAsset } from '../../lib/artistPortal'
import { fetchPortalData, type PortalData, type PortalItem, type PortalReport, type PortalItemFile } from '../../lib/portal'
import { QUIC_MAGENTA, colors } from '../../lib/theme'

type TabKey = 'agenda' | 'clipping' | 'contents' | 'documents'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="folder-open-outline" size={36} color={colors.gray300} />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  )
}

function AgendaItemCard({ item }: { item: ArtistAgendaItem }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardMeta}>{formatDateTime(item.starts_at)}</Text>
      <Text style={styles.cardTitle}>{item.title}</Text>
      {item.location && <Text style={styles.cardSubtitle}>{item.location}</Text>}
    </View>
  )
}

function AgendaTab({ upcoming, past }: { upcoming: ArtistAgendaItem[]; past: ArtistAgendaItem[] }) {
  const [showPast, setShowPast] = useState(false)

  if (upcoming.length === 0 && past.length === 0) {
    return <EmptyState message="Sem compromissos agendados." />
  }
  return (
    <View style={styles.tabContent}>
      {upcoming.length === 0 ? (
        <EmptyState message="Sem compromissos futuros." />
      ) : (
        upcoming.map(item => <AgendaItemCard key={item.id} item={item} />)
      )}

      {past.length > 0 && (
        <View>
          <Pressable
            onPress={() => setShowPast(v => !v)}
            style={({ pressed }) => [styles.pastToggle, pressed && styles.pastTogglePressed]}
            accessibilityRole="button"
            accessibilityLabel={showPast ? 'Ocultar compromissos passados' : 'Mostrar compromissos passados'}
          >
            <Text style={styles.pastToggleText}>Passados {showPast ? '−' : '+'}</Text>
          </Pressable>
          {showPast && past.map(item => <AgendaItemCard key={item.id} item={item} />)}
        </View>
      )}
    </View>
  )
}

interface ClippingLike {
  id: string
  title: string
  url: string
  source: string | null
}

function ClippingTab({ clippings }: { clippings: ClippingLike[] }) {
  if (clippings.length === 0) {
    return <EmptyState message="Sem imprensa." />
  }
  return (
    <View style={styles.tabContent}>
      {clippings.map(clipping => (
        <Pressable
          key={clipping.id}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => Linking.openURL(clipping.url)}
          accessibilityRole="link"
          accessibilityLabel={clipping.title}
        >
          <Text style={styles.cardTitle}>{clipping.title}</Text>
          {clipping.source && <Text style={styles.cardSubtitle}>{clipping.source}</Text>}
        </Pressable>
      ))}
    </View>
  )
}

function AssetListTab({ assets, emptyMessage }: { assets: ArtistAsset[]; emptyMessage: string }) {
  if (assets.length === 0) {
    return <EmptyState message={emptyMessage} />
  }
  return (
    <View style={styles.tabContent}>
      {assets.map(asset => (
        <Pressable
          key={asset.id}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => {
            const url = asset.external_url ?? asset.blob_url
            if (url) Linking.openURL(url)
          }}
          accessibilityRole="link"
          accessibilityLabel={asset.title}
        >
          <Text style={styles.cardTitle}>{asset.title}</Text>
          <Text style={styles.cardSubtitle}>{formatDate(asset.created_at)}</Text>
        </Pressable>
      ))}
    </View>
  )
}

function ArtistPortalContent({ artist, data }: { artist: { name: string }; data: ArtistPortalData }) {
  const [activeTab, setActiveTab] = useState<TabKey>('agenda')

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'agenda', label: 'Agenda' },
    ...(data.clippings.length > 0 ? [{ key: 'clipping' as const, label: 'Imprensa' }] : []),
    ...(data.contents.length > 0 ? [{ key: 'contents' as const, label: 'Conteúdos' }] : []),
    ...(data.documents.length > 0 ? [{ key: 'documents' as const, label: 'Documentos' }] : []),
  ]

  return (
    <View style={styles.container}>
      <BannerHeader source={require('../../assets/banners/artists.png')} />
      <View style={styles.nameBlock}>
        <Text style={styles.name}>{displayArtistName(artist.name)}</Text>
      </View>

      {tabs.length > 1 && (
        <View style={styles.tabBar}>
          {tabs.map(tab => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={({ pressed }) => [styles.tabButton, pressed && styles.tabButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: activeTab === tab.key }}
            >
              <Text style={[styles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <FlatList
        data={[activeTab]}
        keyExtractor={item => item}
        contentContainerStyle={styles.body}
        renderItem={() => {
          if (activeTab === 'agenda') return <AgendaTab upcoming={data.upcoming} past={data.past} />
          if (activeTab === 'clipping') return <ClippingTab clippings={data.clippings} />
          if (activeTab === 'contents') return <AssetListTab assets={data.contents} emptyMessage="Sem conteúdos." />
          return <AssetListTab assets={data.documents} emptyMessage="Sem documentos." />
        }}
      />
    </View>
  )
}

const STATUS_LABELS: Record<string, string> = {
  completed: 'Concluído',
  in_progress: 'Em curso',
  pending: 'Pendente',
}

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
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

type ClientTabKey = 'checklist' | 'press' | 'documents'

function DocumentsAndReportsTab({ reports, eventFiles }: { reports: PortalReport[]; eventFiles: PortalItemFile[] }) {
  if (reports.length === 0 && eventFiles.length === 0) {
    return <EmptyState message="Sem documentos." />
  }
  return (
    <View style={styles.tabContent}>
      {reports.map(report => (
        <Pressable
          key={report.id}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => Linking.openURL(report.blob_url)}
          accessibilityRole="link"
          accessibilityLabel={report.title}
        >
          <Text style={styles.cardTitle}>{report.title}</Text>
          <Text style={styles.cardSubtitle}>{formatDate(report.created_at)}</Text>
        </Pressable>
      ))}
      {eventFiles.map(file => (
        <Pressable
          key={file.id}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => Linking.openURL(file.blob_url)}
          accessibilityRole="link"
          accessibilityLabel={file.file_name}
        >
          <Text style={styles.cardTitle}>{file.file_name}</Text>
        </Pressable>
      ))}
    </View>
  )
}

function ChecklistTab({ data }: { data: PortalData }) {
  const { items, progress } = data
  return (
    <View style={styles.tabContent}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress.percent}%` }]} />
      </View>
      <Text style={styles.progressLabel}>{progress.completed} de {progress.total} concluídas</Text>
      {items.length === 0 ? (
        <EmptyState message="Sem etapas disponíveis." />
      ) : (
        items.map(item => <ChecklistItemRow key={item.id} item={item} />)
      )}
    </View>
  )
}

function MeuEventoContent({ data }: { data: PortalData }) {
  const insets = useSafeAreaInsets()
  const { event, articles, reports, eventFiles } = data
  const [activeTab, setActiveTab] = useState<ClientTabKey>('checklist')

  const tabs: Array<{ key: ClientTabKey; label: string }> = [
    { key: 'checklist', label: 'Checklist' },
    ...(articles.length > 0 ? [{ key: 'press' as const, label: 'Imprensa' }] : []),
    ...(reports.length > 0 || eventFiles.length > 0 ? [{ key: 'documents' as const, label: 'Documentos' }] : []),
  ]

  return (
    <View style={styles.container}>
      <BannerHeader source={require('../../assets/banners/events.png')} />
      <View style={styles.nameBlock}>
        <Text style={styles.eventName}>{event.name}</Text>
        <Text style={styles.eventMeta}>{formatEventDate(event.start_datetime)}</Text>
        {event.venue_name && <Text style={styles.eventMeta}>{event.venue_name}</Text>}
      </View>

      {tabs.length > 1 && (
        <View style={styles.tabBar}>
          {tabs.map(tab => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={({ pressed }) => [styles.tabButton, pressed && styles.tabButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: activeTab === tab.key }}
            >
              <Text style={[styles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <FlatList
        data={[activeTab]}
        keyExtractor={item => item}
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 16 }]}
        renderItem={() => {
          if (activeTab === 'press') return <ClippingTab clippings={articles} />
          if (activeTab === 'documents') return <DocumentsAndReportsTab reports={reports} eventFiles={eventFiles} />
          return <ChecklistTab data={data} />
        }}
      />
    </View>
  )
}

type FetchState =
  | { status: 'loading' }
  | { status: 'loaded'; data: PortalData }
  | { status: 'error' }

function ClientPortalContent({ portalToken }: { portalToken: string }) {
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'loading' })

  useEffect(() => {
    setFetchState({ status: 'loading' })
    fetchPortalData(process.env.EXPO_PUBLIC_APP_URL!, portalToken).then(result => {
      setFetchState(result ? { status: 'loaded', data: result } : { status: 'error' })
    })
  }, [portalToken])

  if (fetchState.status === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.restricted}>Não foi possível carregar o teu evento. Tenta novamente mais tarde.</Text>
      </View>
    )
  }

  if (fetchState.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={QUIC_MAGENTA} />
      </View>
    )
  }

  return <MeuEventoContent data={fetchState.data} />
}

export default function PortalScreen() {
  const { session } = useSession()
  const [role, setRole] = useState<UserRole | null>(null)
  const [data, setData] = useState<ArtistPortalData | null>(null)

  useEffect(() => {
    resolveUserRole(supabase, session).then(setRole)
  }, [session])

  useEffect(() => {
    if (role?.role === 'artist') {
      fetchArtistPortalData(supabase, role.artist.id).then(setData)
    }
  }, [role])

  if (!role) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={QUIC_MAGENTA} />
      </View>
    )
  }

  if (role.role === 'artist') {
    if (!data) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={QUIC_MAGENTA} />
        </View>
      )
    }
    return <ArtistPortalContent artist={role.artist} data={data} />
  }

  if (role.role === 'client') {
    if (!role.portalToken) {
      return (
        <View style={styles.center}>
          <Text style={styles.restricted}>Sem evento associado à tua conta.</Text>
        </View>
      )
    }
    return <ClientPortalContent portalToken={role.portalToken} />
  }

  return (
    <View style={styles.center}>
      <Text style={styles.restricted}>Portal reservado a artistas agenciados</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  nameBlock: { paddingHorizontal: 24, paddingVertical: 24, marginTop: -8, alignItems: 'center' },
  name: { color: colors.gray900, fontSize: 26, fontWeight: 'bold', textAlign: 'center' },
  restricted: { color: colors.gray600, fontSize: 14, textAlign: 'center' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  tabButton: { flex: 1, paddingHorizontal: 8, paddingVertical: 12, alignItems: 'center' },
  tabButtonPressed: { backgroundColor: colors.gray50 },
  tabButtonText: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.gray400, fontWeight: '600', textAlign: 'center' },
  tabButtonTextActive: { color: QUIC_MAGENTA },
  body: { padding: 16 },
  tabContent: { gap: 12 },
  pastToggle: { paddingVertical: 8 },
  pastTogglePressed: { opacity: 0.6 },
  pastToggleText: { fontSize: 12, color: colors.gray400, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray100, borderRadius: 6, padding: 14 },
  cardPressed: { backgroundColor: colors.gray100 },
  cardMeta: { fontSize: 11, color: colors.gray400, marginBottom: 4 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.gray900 },
  cardSubtitle: { fontSize: 12, color: colors.gray500, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  emptyText: { color: colors.gray500, fontSize: 14, textAlign: 'center' },
  eventName: { color: colors.gray900, fontSize: 26, fontWeight: 'bold', marginBottom: 6 },
  eventMeta: { color: colors.gray500, fontSize: 13 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, marginTop: 18, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.white, borderRadius: 3 },
  progressLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  itemTitle: { fontSize: 14, color: colors.gray900, flex: 1, marginRight: 12 },
  itemTitleDone: { color: colors.gray400, textDecorationLine: 'line-through' },
  itemStatus: { fontSize: 11, color: colors.gray500, textTransform: 'uppercase', letterSpacing: 0.5 },
})
