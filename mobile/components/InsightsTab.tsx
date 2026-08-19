// mobile/components/InsightsTab.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../lib/theme'
import { supabase } from '../lib/supabase'
import { fetchInvestorInsights, type InvestorInsightsBreakdown } from '../lib/investorInsights'

type InsightsFetchState =
  | { status: 'loading' }
  | { status: 'loaded'; breakdown: InvestorInsightsBreakdown[] }
  | { status: 'error' }

const currencyFormatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
const percentFormatter = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

function formatPercentage(percentage: number): string {
  return percentFormatter.format(percentage)
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  returned: 'Devolvido',
  written_off: 'Perdido',
}

const STATUS_BAR_COLORS: Record<string, string> = {
  active: '#10b981',
  returned: '#0ea5e9',
  written_off: '#ef4444',
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

function statusBarColor(status: string): string {
  return STATUS_BAR_COLORS[status] ?? colors.gray400
}

function investmentsCountText(count: number): string {
  return `${count} investimento${count === 1 ? '' : 's'}`
}

function BreakdownCard({ breakdown }: { breakdown: InvestorInsightsBreakdown }) {
  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{statusLabel(breakdown.status)}</Text>
      </View>
      <Text style={styles.countText}>{investmentsCountText(breakdown.count)}</Text>
      <Text style={styles.totalText}>{formatCents(breakdown.totalCents)}</Text>
      <Text style={styles.percentText}>{formatPercentage(breakdown.percentage)}%</Text>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${Math.min(breakdown.percentage, 100)}%`, backgroundColor: statusBarColor(breakdown.status) },
          ]}
        />
      </View>
    </View>
  )
}

export function InsightsTab({ investorId }: { investorId: string }) {
  const [fetchState, setFetchState] = useState<InsightsFetchState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setFetchState({ status: 'loading' })
    fetchInvestorInsights(supabase, investorId)
      .then(breakdown => { if (!cancelled) setFetchState({ status: 'loaded', breakdown }) })
      .catch(() => { if (!cancelled) setFetchState({ status: 'error' }) })
    return () => { cancelled = true }
  }, [investorId])

  if (fetchState.status === 'loading') {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateBody}>A carregar...</Text>
      </View>
    )
  }

  if (fetchState.status === 'error') {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateBody}>Não foi possível carregar os teus insights. Tenta novamente mais tarde.</Text>
      </View>
    )
  }

  const { breakdown } = fetchState
  const hasAnyInvestments = breakdown.some(b => b.count > 0)

  if (!hasAnyInvestments) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateBody}>Ainda não tens investimentos para analisar.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {breakdown.map(entry => <BreakdownCard key={entry.status} breakdown={entry} />)}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  stateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  stateBody: { color: colors.gray500, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 16,
    gap: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gray200,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.gray700 },
  countText: { color: colors.gray500, fontSize: 12, marginTop: 4 },
  totalText: { color: colors.gray900, fontSize: 18, fontWeight: '700' },
  percentText: { color: colors.gray500, fontSize: 12, marginBottom: 4 },
  barTrack: { height: 6, width: '100%', backgroundColor: colors.gray200, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
})
