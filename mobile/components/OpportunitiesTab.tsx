// mobile/components/OpportunitiesTab.tsx
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../lib/theme'
import { supabase } from '../lib/supabase'
import { fetchInvestorOpportunities, type InvestorOpportunity } from '../lib/investorOpportunities'

type OpportunitiesFetchState =
  | { status: 'loading' }
  | { status: 'loaded'; opportunities: InvestorOpportunity[] }
  | { status: 'error' }

const currencyFormatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
const dateFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })

function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

function OpportunityCard({ opportunity }: { opportunity: InvestorOpportunity }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{opportunity.name}</Text>
      {opportunity.description && (
        <Text style={styles.cardDescription} numberOfLines={2}>{opportunity.description}</Text>
      )}
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.cardLabel}>Meta</Text>
          <Text style={styles.cardValue}>{formatCents(opportunity.fundingGoalCents)}</Text>
        </View>
        {opportunity.investmentDeadline && (
          <View style={styles.cardFooterRight}>
            <Text style={styles.cardLabel}>Prazo</Text>
            <Text style={styles.cardValue}>{dateFormatter.format(new Date(opportunity.investmentDeadline))}</Text>
          </View>
        )}
      </View>
    </View>
  )
}

export function OpportunitiesTab() {
  const [fetchState, setFetchState] = useState<OpportunitiesFetchState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setFetchState({ status: 'loading' })
    fetchInvestorOpportunities(supabase)
      .then(opportunities => { if (!cancelled) setFetchState({ status: 'loaded', opportunities }) })
      .catch(() => { if (!cancelled) setFetchState({ status: 'error' }) })
    return () => { cancelled = true }
  }, [])

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
        <Text style={styles.stateBody}>Não foi possível carregar as oportunidades. Tenta novamente mais tarde.</Text>
      </View>
    )
  }

  if (fetchState.opportunities.length === 0) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateBody}>Sem oportunidades disponíveis de momento.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {fetchState.opportunities.map(opportunity => (
        <OpportunityCard key={opportunity.id} opportunity={opportunity} />
      ))}
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
    gap: 8,
  },
  cardTitle: { color: colors.gray900, fontSize: 15, fontWeight: '600' },
  cardDescription: { color: colors.gray500, fontSize: 12, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.gray200, paddingTop: 8 },
  cardFooterRight: { alignItems: 'flex-end' },
  cardLabel: { color: colors.gray400, fontSize: 10 },
  cardValue: { color: colors.gray900, fontSize: 13, fontWeight: '600' },
})
