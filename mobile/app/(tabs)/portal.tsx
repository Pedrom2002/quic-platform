import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, FlatList, Pressable, Linking, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSession } from '../../hooks/useSession'
import { resolveUserRole, type UserRole } from '../../lib/role'
import { supabase } from '../../lib/supabase'
import { fetchArtistPortalData, type ArtistPortalData, type ArtistAgendaItem, type ArtistClipping, type ArtistAsset } from '../../lib/artistPortal'
import { fetchPortalData, type PortalData, type PortalItem, type PortalReport, type PortalItemFile } from '../../lib/portal'

type TabKey = 'agenda' | 'clipping' | 'contents' | 'documents'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
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
    return <Text style={styles.emptyText}>Sem compromissos agendados.</Text>
  }
  return (
    <View style={styles.tabContent}>
      {upcoming.length === 0 ? (
        <Text style={styles.emptyText}>Sem compromissos futuros.</Text>
      ) : (
        upcoming.map(item => <AgendaItemCard key={item.id} item={item} />)
      )}

      {past.length > 0 && (
        <View>
          <Pressable onPress={() => setShowPast(v => !v)} style={styles.pastToggle}>
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
    return <Text style={styles.emptyText}>Sem imprensa.</Text>
  }
  return (
    <View style={styles.tabContent}>
      {clippings.map(clipping => (
        <Pressable key={clipping.id} style={styles.card} onPress={() => Linking.openURL(clipping.url)}>
          <Text style={styles.cardTitle}>{clipping.title}</Text>
          {clipping.source && <Text style={styles.cardSubtitle}>{clipping.source}</Text>}
        </Pressable>
      ))}
    </View>
  )
}

function AssetListTab({ assets, emptyMessage }: { assets: ArtistAsset[]; emptyMessage: string }) {
  if (assets.length === 0) {
    return <Text style={styles.emptyText}>{emptyMessage}</Text>
  }
  return (
    <View style={styles.tabContent}>
      {assets.map(asset => (
        <Pressable
          key={asset.id}
          style={styles.card}
          onPress={() => {
            const url = asset.external_url ?? asset.blob_url
            if (url) Linking.openURL(url)
          }}
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
  const insets = useSafeAreaInsets()

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'agenda', label: 'Agenda' },
    ...(data.clippings.length > 0 ? [{ key: 'clipping' as const, label: 'Imprensa' }] : []),
    ...(data.contents.length > 0 ? [{ key: 'contents' as const, label: 'Conteúdos' }] : []),
    ...(data.documents.length > 0 ? [{ key: 'documents' as const, label: 'Documentos' }] : []),
  ]

  return (
    <View style={styles.container}>
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.label}>PORTAL DO ARTISTA</Text>
        <Text style={styles.name}>{artist.name}</Text>
      </View>

      {tabs.length > 1 && (
        <View style={styles.tabBar}>
          {tabs.map(tab => (
            <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={styles.tabButton}>
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

type ClientTabKey = 'checklist' | 'press' | 'documents'

function DocumentsAndReportsTab({ reports, eventFiles }: { reports: PortalReport[]; eventFiles: PortalItemFile[] }) {
  if (reports.length === 0 && eventFiles.length === 0) {
    return <Text style={styles.emptyText}>Sem documentos.</Text>
  }
  return (
    <View style={styles.tabContent}>
      {reports.map(report => (
        <Pressable key={report.id} style={styles.card} onPress={() => Linking.openURL(report.blob_url)}>
          <Text style={styles.cardTitle}>{report.title}</Text>
          <Text style={styles.cardSubtitle}>{formatDate(report.created_at)}</Text>
        </Pressable>
      ))}
      {eventFiles.map(file => (
        <Pressable key={file.id} style={styles.card} onPress={() => Linking.openURL(file.blob_url)}>
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
        <Text style={styles.emptyText}>Sem etapas disponíveis.</Text>
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
      <View style={[styles.clientHero, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.clientLabel}>O MEU EVENTO</Text>
        <Text style={styles.eventName}>{event.name}</Text>
        <Text style={styles.eventMeta}>{formatEventDate(event.start_datetime)}</Text>
        {event.venue_name && <Text style={styles.eventMeta}>{event.venue_name}</Text>}
      </View>

      {tabs.length > 1 && (
        <View style={styles.tabBar}>
          {tabs.map(tab => (
            <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={styles.tabButton}>
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
        <ActivityIndicator color="#9333EA" />
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
        <ActivityIndicator color="#9333EA" />
      </View>
    )
  }

  if (role.role === 'artist') {
    if (!data) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color="#9333EA" />
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
  container: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  hero: { backgroundColor: '#9333EA', paddingHorizontal: 24, paddingVertical: 32 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 3, marginBottom: 12 },
  name: { color: '#ffffff', fontSize: 32, fontWeight: 'bold' },
  restricted: { color: '#57534e', fontSize: 14, textAlign: 'center' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e7e5e4' },
  tabButton: { flex: 1, paddingHorizontal: 8, paddingVertical: 12, alignItems: 'center' },
  tabButtonText: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#a8a29e', fontWeight: '600', textAlign: 'center' },
  tabButtonTextActive: { color: '#9333EA' },
  body: { padding: 16 },
  tabContent: { gap: 12 },
  pastToggle: { paddingVertical: 8 },
  pastToggleText: { fontSize: 12, color: '#a8a29e', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: '#fafaf9', borderWidth: 1, borderColor: '#f5f5f4', borderRadius: 6, padding: 14 },
  cardMeta: { fontSize: 11, color: '#a8a29e', marginBottom: 4 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1c1917' },
  cardSubtitle: { fontSize: 12, color: '#78716c', marginTop: 2 },
  emptyText: { color: '#78716c', fontSize: 14, padding: 16 },
  clientHero: { backgroundColor: '#9333EA', paddingHorizontal: 24, paddingBottom: 20 },
  clientLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 3, marginBottom: 12 },
  eventName: { color: '#ffffff', fontSize: 26, fontWeight: 'bold', marginBottom: 6 },
  eventMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, marginTop: 18, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#ffffff', borderRadius: 3 },
  progressLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f4' },
  itemTitle: { fontSize: 14, color: '#1c1917', flex: 1, marginRight: 12 },
  itemTitleDone: { color: '#a8a29e', textDecorationLine: 'line-through' },
  itemStatus: { fontSize: 11, color: '#78716c', textTransform: 'uppercase', letterSpacing: 0.5 },
  clientEmptyText: { color: '#78716c', fontSize: 14, textAlign: 'center', padding: 24 },
})
