import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, FlatList, Pressable, Linking, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSession } from '../../hooks/useSession'
import { resolveUserRole, type UserRole } from '../../lib/role'
import { supabase } from '../../lib/supabase'
import { fetchArtistPortalData, type ArtistPortalData, type ArtistAgendaItem, type ArtistClipping, type ArtistAsset } from '../../lib/artistPortal'

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

function ClippingTab({ clippings }: { clippings: ArtistClipping[] }) {
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
        <ActivityIndicator color="#8B2FC9" />
      </View>
    )
  }

  if (role.role === 'artist') {
    if (!data) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color="#8B2FC9" />
        </View>
      )
    }
    return <ArtistPortalContent artist={role.artist} data={data} />
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
  hero: { backgroundColor: '#8B2FC9', paddingHorizontal: 24, paddingVertical: 32 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 3, marginBottom: 12 },
  name: { color: '#ffffff', fontSize: 32, fontWeight: 'bold' },
  restricted: { color: '#57534e', fontSize: 14, textAlign: 'center' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e7e5e4' },
  tabButton: { flex: 1, paddingHorizontal: 8, paddingVertical: 12, alignItems: 'center' },
  tabButtonText: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#a8a29e', fontWeight: '600', textAlign: 'center' },
  tabButtonTextActive: { color: '#8B2FC9' },
  body: { padding: 16 },
  tabContent: { gap: 12 },
  pastToggle: { paddingVertical: 8 },
  pastToggleText: { fontSize: 12, color: '#a8a29e', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: '#fafaf9', borderWidth: 1, borderColor: '#f5f5f4', borderRadius: 6, padding: 14 },
  cardMeta: { fontSize: 11, color: '#a8a29e', marginBottom: 4 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1c1917' },
  cardSubtitle: { fontSize: 12, color: '#78716c', marginTop: 2 },
  emptyText: { color: '#78716c', fontSize: 14, padding: 16 },
})
