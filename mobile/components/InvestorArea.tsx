// mobile/components/InvestorArea.tsx
import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { colors } from '../lib/theme'
import type { DashboardFetchState } from '../lib/investorDashboard'
import { InvestorDashboard } from './InvestorDashboard'
import { OpportunitiesTab } from './OpportunitiesTab'

export type InvestorAreaTab =
  | 'dashboard'
  | 'opportunities'
  | 'portfolio'
  | 'documents'
  | 'profile'
  | 'track-record'
  | 'insights'

const GOLD = '#D4AF37'

const TABS: { id: InvestorAreaTab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'documents', label: 'Documents' },
  { id: 'profile', label: 'Profile' },
  { id: 'track-record', label: 'Track Record' },
  { id: 'insights', label: 'Insights' },
]

function PlaceholderTab({ label }: { label: string }) {
  return (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderTitle}>{label}</Text>
      <Text style={styles.placeholderBody}>Esta área estará disponível em breve.</Text>
    </View>
  )
}

function DashboardTab({ dashboardFetch }: { dashboardFetch: DashboardFetchState }) {
  if (dashboardFetch.status === 'loaded') {
    return <InvestorDashboard stats={dashboardFetch.stats} />
  }
  if (dashboardFetch.status === 'loading') {
    return (
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderBody}>A carregar...</Text>
      </View>
    )
  }
  return (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderBody}>
        Não foi possível carregar os teus dados. Tenta novamente mais tarde.
      </Text>
    </View>
  )
}

export function InvestorArea({ dashboardFetch }: { dashboardFetch: DashboardFetchState }) {
  const [activeTab, setActiveTab] = useState<InvestorAreaTab>('dashboard')

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tabBarStyles.container}
      >
        {TABS.map(tab => (
          <Pressable
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[tabBarStyles.tab, activeTab === tab.id && tabBarStyles.tabActive]}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
          >
            <Text style={[tabBarStyles.tabText, activeTab === tab.id && tabBarStyles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {activeTab === 'dashboard' && <DashboardTab dashboardFetch={dashboardFetch} />}
      {activeTab === 'opportunities' && <OpportunitiesTab />}
      {activeTab === 'portfolio' && <PlaceholderTab label="Portfolio" />}
      {activeTab === 'documents' && <PlaceholderTab label="Documents" />}
      {activeTab === 'profile' && <PlaceholderTab label="Profile" />}
      {activeTab === 'track-record' && <PlaceholderTab label="Track Record" />}
      {activeTab === 'insights' && <PlaceholderTab label="Insights" />}
    </View>
  )
}

const tabBarStyles = StyleSheet.create({
  container: { paddingHorizontal: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: GOLD },
  tabText: { fontSize: 12, color: colors.gray400, fontWeight: '500' },
  tabTextActive: { color: colors.gray900 },
})

const styles = StyleSheet.create({
  container: { flex: 1 },
  placeholderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  placeholderTitle: { color: colors.gray900, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  placeholderBody: { color: colors.gray500, fontSize: 13, textAlign: 'center', lineHeight: 20 },
})
