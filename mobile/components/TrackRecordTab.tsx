// mobile/components/TrackRecordTab.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, QUIC_MAGENTA } from '../lib/theme'
import { supabase } from '../lib/supabase'
import { fetchInvestorTrackRecord, type InvestorTrackRecordSummary, type InvestorTrackRecordProject } from '../lib/investorTrackRecord'

type TrackRecordFetchState =
  | { status: 'loading' }
  | { status: 'loaded'; summary: InvestorTrackRecordSummary }
  | { status: 'error' }

const currencyFormatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })

function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  )
}

function ProjectCard({ project }: { project: InvestorTrackRecordProject }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{project.name}</Text>
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.cardLabel}>Meta</Text>
          <Text style={styles.cardValue}>{formatCents(project.fundingGoalCents)}</Text>
        </View>
        <View>
          <Text style={styles.cardLabel}>Receita Real</Text>
          <Text style={styles.cardValue}>
            {project.actualRevenueCents != null ? formatCents(project.actualRevenueCents) : '—'}
          </Text>
        </View>
        <View style={styles.cardFooterRight}>
          <Text style={styles.cardLabel}>Assistência</Text>
          <Text style={styles.cardValue}>{project.attendance != null ? String(project.attendance) : '—'}</Text>
        </View>
      </View>
    </View>
  )
}

export function TrackRecordTab() {
  const [fetchState, setFetchState] = useState<TrackRecordFetchState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setFetchState({ status: 'loading' })
    fetchInvestorTrackRecord(supabase)
      .then(summary => { if (!cancelled) setFetchState({ status: 'loaded', summary }) })
      .catch(() => { if (!cancelled) setFetchState({ status: 'error' }) })
    return () => { cancelled = true }
  }, [])

  if (fetchState.status === 'loading') {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator color={QUIC_MAGENTA} />
      </View>
    )
  }

  if (fetchState.status === 'error') {
    return (
      <View style={styles.stateContainer}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.gray300} />
        <Text style={styles.stateBody}>Não foi possível carregar o histórico. Tenta novamente mais tarde.</Text>
      </View>
    )
  }

  const { summary } = fetchState

  if (summary.projects.length === 0) {
    return (
      <View style={styles.stateContainer}>
        <Ionicons name="bar-chart-outline" size={40} color={colors.gray300} />
        <Text style={styles.stateBody}>Ainda não há projetos concluídos para mostrar.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.metricsRow}>
        <MetricCard label="Projetos concluídos" value={String(summary.completedCount)} />
        <MetricCard label="Receita total" value={formatCents(summary.totalRevenueCents)} />
        <MetricCard label="Assistência total" value={String(summary.totalAttendance)} />
      </View>

      <View style={styles.list}>
        {summary.projects.map(project => <ProjectCard key={project.id} project={project} />)}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  stateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  stateBody: { color: colors.gray500, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricCard: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 12,
    gap: 2,
  },
  metricLabel: { color: colors.gray500, fontSize: 11 },
  metricValue: { color: colors.gray900, fontSize: 16, fontWeight: '700' },
  list: { gap: 12 },
  card: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 16,
    gap: 12,
  },
  cardTitle: { color: colors.gray900, fontSize: 15, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.gray200, paddingTop: 8 },
  cardFooterRight: { alignItems: 'flex-end' },
  cardLabel: { color: colors.gray500, fontSize: 10 },
  cardValue: { color: colors.gray900, fontSize: 13, fontWeight: '600' },
})
