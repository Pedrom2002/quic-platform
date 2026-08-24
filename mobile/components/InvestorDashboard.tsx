import { View, Text, StyleSheet } from 'react-native'
import { LineChart, PieChart } from 'react-native-gifted-charts'
import type { InvestorDashboardStats } from '../lib/investorDashboard'
import { colors } from '../lib/theme'

const currencyFormatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })

function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

const DONUT_COLORS = [colors.brand, '#22c55e', '#f97316', '#0ea5e9', '#a855f7', '#ec4899']

// Sem histórico real de valor por mês na BD (investments só guarda o estado
// atual, não uma série temporal). Mesma abordagem já usada no web
// (app/investors/(gated)/dashboard/page.tsx): curva de demonstração fixa,
// escalada ao valor estimado atual, com nota explícita de que são dados
// de demonstração.
const DEMO_MONTHS = ['Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago']
const DEMO_SHAPE = [0.62, 0.71, 0.68, 0.8, 0.9, 1]

function buildEvolutionSeries(estimatedValueCents: number) {
  return DEMO_MONTHS.map((month, i) => ({
    value: Math.round((estimatedValueCents * DEMO_SHAPE[i]) / 100),
    label: month,
  }))
}

function MetricCard({ label, value, caption, valueColor }: { label: string; value: string; caption: string; valueColor?: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      <Text style={styles.cardCaption}>{caption}</Text>
    </View>
  )
}

export function InvestorDashboard({ stats }: { stats: InvestorDashboardStats }) {
  const projectedReturnPercentage =
    stats.investedCents > 0 ? (stats.projectedReturnCents / stats.investedCents) * 100 : 0

  if (stats.investedCents === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Ainda não tens investimentos ativos.</Text>
      </View>
    )
  }

  const evolutionSeries = buildEvolutionSeries(stats.estimatedValueCents)
  const pieData = stats.distribution.map((entry, i) => ({
    value: entry.amountCents,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
    text: `${entry.percentage}%`,
  }))

  return (
    <View style={styles.container}>
      <View style={styles.cardsRow}>
        <MetricCard
          label="Capital investido"
          value={formatCents(stats.investedCents)}
          caption={`${stats.activeProjects} projeto${stats.activeProjects === 1 ? '' : 's'} ativo${stats.activeProjects === 1 ? '' : 's'}`}
        />
        <MetricCard
          label="Valor estimado"
          value={formatCents(stats.estimatedValueCents)}
          caption="Atualizado após cada settlement"
        />
        <MetricCard
          label="Retorno estimado"
          value={`${projectedReturnPercentage >= 0 ? '+' : ''}${projectedReturnPercentage.toFixed(1)}%`}
          caption={`${formatCents(stats.projectedReturnCents)} sobre o capital`}
          valueColor={projectedReturnPercentage >= 0 ? colors.success : colors.danger}
        />
      </View>

      <View style={styles.chartBlock}>
        <Text style={styles.chartTitle}>Evolução do portfolio</Text>
        <LineChart
          data={evolutionSeries}
          areaChart
          color={colors.brand}
          startFillColor={colors.brand}
          endFillColor={colors.brand}
          startOpacity={0.25}
          endOpacity={0}
          thickness={2}
          hideRules
          yAxisTextStyle={{ color: colors.gray500, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: colors.gray500, fontSize: 10 }}
          noOfSections={3}
          height={160}
        />
        <Text style={styles.chartNote}>
          Dados de demonstração — não reflete a evolução real mês a mês.
        </Text>
      </View>

      {stats.distribution.length > 0 && (
        <View style={styles.chartBlock}>
          <Text style={styles.chartTitle}>Distribuição</Text>
          <View style={styles.donutRow}>
            <PieChart
              data={pieData}
              donut
              radius={70}
              innerRadius={45}
              centerLabelComponent={() => (
                <Text style={styles.donutCenterText}>{formatCents(stats.investedCents)}</Text>
              )}
            />
            <View style={styles.legend}>
              {stats.distribution.map((entry, i) => (
                <View key={entry.name} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }]} />
                  <Text style={styles.legendText} numberOfLines={1}>{entry.name}</Text>
                  <Text style={styles.legendPercent}>{entry.percentage}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  emptyText: { color: colors.gray500, fontSize: 13, textAlign: 'center', paddingVertical: 32 },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 12,
    gap: 2,
  },
  cardLabel: { color: colors.gray500, fontSize: 11 },
  cardValue: { color: colors.gray900, fontSize: 16, fontWeight: '700' },
  cardCaption: { color: colors.gray500, fontSize: 10 },
  chartBlock: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 16,
    gap: 8,
  },
  chartTitle: { color: colors.gray900, fontSize: 14, fontWeight: '600' },
  chartNote: { color: colors.gray500, fontSize: 10 },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  donutCenterText: { fontSize: 11, fontWeight: '700', color: colors.gray900 },
  legend: { flex: 1, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { flex: 1, color: colors.gray700, fontSize: 11 },
  legendPercent: { color: colors.gray900, fontSize: 11, fontWeight: '600' },
})
