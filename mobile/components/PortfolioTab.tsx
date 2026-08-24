// mobile/components/PortfolioTab.tsx
import { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, QUIC_MAGENTA } from '../lib/theme'
import { supabase } from '../lib/supabase'
import { fetchInvestorPortfolio, type InvestorPortfolioSummary, type InvestorPortfolioRow } from '../lib/investorPortfolio'

type PortfolioFetchState =
  | { status: 'loading' }
  | { status: 'loaded'; summary: InvestorPortfolioSummary }
  | { status: 'error' }

type FilterKey = 'all' | 'active' | 'completed'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Ativos' },
  { key: 'completed', label: 'Concluídos' },
]

const PHASE_LABELS: Record<string, string> = {
  coming_soon: 'Brevemente',
  open: 'Em venda',
  closed: 'Produção',
  completed: 'Settlement',
}

const NEXT_MILESTONE: Record<string, string> = {
  coming_soon: 'Abertura brevemente',
  open: 'Fecho early bird',
  closed: 'Fecho de patrocinadores',
  completed: 'Distribuição',
}

function phaseLabel(projectStatus: string | null): string {
  return PHASE_LABELS[projectStatus ?? ''] ?? 'Sem fase'
}

function nextMilestone(projectStatus: string | null): string {
  return NEXT_MILESTONE[projectStatus ?? ''] ?? '—'
}

function matchesFilter(row: InvestorPortfolioRow, filter: FilterKey): boolean {
  if (filter === 'all') return true
  if (filter === 'active') return row.investmentStatus === 'active'
  return row.investmentStatus === 'returned' || row.investmentStatus === 'written_off'
}

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

function InvestmentCard({ row }: { row: InvestorPortfolioRow }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>{row.projectName}</Text>
        <View style={styles.phaseBadge}>
          <Text style={styles.phaseBadgeText}>{phaseLabel(row.projectStatus)}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.cardLabel}>Capital</Text>
          <Text style={styles.cardValue}>{formatCents(row.amountCents)}</Text>
        </View>
        <View>
          <Text style={styles.cardLabel}>Retorno estimado</Text>
          <Text style={styles.cardValue}>
            {row.returnPercentage != null ? `+${row.returnPercentage.toFixed(1)}%` : 'n/d'}
          </Text>
        </View>
        <View style={styles.cardFooterRight}>
          <Text style={styles.cardLabel}>Próximo marco</Text>
          <Text style={styles.cardValue}>{nextMilestone(row.projectStatus)}</Text>
        </View>
      </View>
    </View>
  )
}

export function PortfolioTab({ investorId }: { investorId: string }) {
  const [fetchState, setFetchState] = useState<PortfolioFetchState>({ status: 'loading' })
  const [filter, setFilter] = useState<FilterKey>('all')

  useEffect(() => {
    let cancelled = false
    setFetchState({ status: 'loading' })
    fetchInvestorPortfolio(supabase, investorId)
      .then(summary => { if (!cancelled) setFetchState({ status: 'loaded', summary }) })
      .catch(() => { if (!cancelled) setFetchState({ status: 'error' }) })
    return () => { cancelled = true }
  }, [investorId])

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
        <Text style={styles.stateBody}>Não foi possível carregar o teu portfolio. Tenta novamente mais tarde.</Text>
      </View>
    )
  }

  const { summary } = fetchState

  if (summary.rows.length === 0) {
    return (
      <View style={styles.stateContainer}>
        <Ionicons name="briefcase-outline" size={40} color={colors.gray300} />
        <Text style={styles.stateBody}>Ainda não tens investimentos.</Text>
      </View>
    )
  }

  const filteredRows = summary.rows.filter(row => matchesFilter(row, filter))

  return (
    <View style={styles.container}>
      <View style={styles.metricsRow}>
        <MetricCard label="Total investido" value={formatCents(summary.totalCents)} />
        <MetricCard label="Investimentos" value={String(summary.investmentCount)} />
        <MetricCard label="Investimentos ativos" value={String(summary.activeCount)} />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={({ pressed }) => [
              styles.filterPill,
              filter === f.key && styles.filterPillActive,
              pressed && filter !== f.key && styles.filterPillPressed,
            ]}
          >
            <Text style={[styles.filterPillText, filter === f.key && styles.filterPillTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {filteredRows.length === 0 ? (
        <Text style={styles.stateBody}>Sem projetos para este filtro.</Text>
      ) : (
        <View style={styles.list}>
          {filteredRows.map(row => <InvestmentCard key={row.id} row={row} />)}
        </View>
      )}
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
  filterRow: { flexDirection: 'row', gap: 8 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.gray100 },
  filterPillActive: { backgroundColor: colors.gray900 },
  filterPillPressed: { backgroundColor: colors.gray200 },
  filterPillText: { fontSize: 12, color: colors.gray500, fontWeight: '500' },
  filterPillTextActive: { color: colors.white },
  list: { gap: 12 },
  card: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 16,
    gap: 12,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { color: colors.gray900, fontSize: 15, fontWeight: '600', flex: 1 },
  phaseBadge: { backgroundColor: colors.gray200, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  phaseBadgeText: { fontSize: 11, fontWeight: '600', color: colors.gray700 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.gray200, paddingTop: 8 },
  cardFooterRight: { alignItems: 'flex-end' },
  cardLabel: { color: colors.gray500, fontSize: 10 },
  cardValue: { color: colors.gray900, fontSize: 13, fontWeight: '600' },
})
