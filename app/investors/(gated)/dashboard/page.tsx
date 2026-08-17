import { getInvestorDashboardStats } from './actions'
import { EvolutionChart, DistributionChart } from './charts'

const currencyFormatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })

function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

// Sem historico real de valor por mes na BD (investments so guarda o estado
// atual, nao uma serie temporal). Por decisao do utilizador, esta curva usa
// dados de demonstracao (forma fixa, nao interpolacao real) so escalados ao
// valor estimado atual, tal como no mockup fornecido.
const DEMO_MONTHS = ['Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago']
const DEMO_SHAPE = [0.62, 0.71, 0.68, 0.8, 0.9, 1]

function buildEvolutionSeries(estimatedValueCents: number) {
  return DEMO_MONTHS.map((month, i) => ({
    month,
    valueCents: Math.round(estimatedValueCents * DEMO_SHAPE[i]),
  }))
}

export default async function InvestorDashboardPage() {
  const stats = await getInvestorDashboardStats()

  const projectedReturnPercentage =
    stats.investedCents > 0 ? (stats.projectedReturnCents / stats.investedCents) * 100 : 0

  const cards = [
    {
      label: 'Capital investido',
      value: formatCents(stats.investedCents),
      caption: `${stats.activeProjects} projeto${stats.activeProjects === 1 ? '' : 's'} ativo${stats.activeProjects === 1 ? '' : 's'}`,
    },
    {
      label: 'Valor estimado',
      value: formatCents(stats.estimatedValueCents),
      caption: 'Atualizado após cada settlement',
    },
    {
      label: 'Retorno estimado',
      value: `${projectedReturnPercentage >= 0 ? '+' : ''}${projectedReturnPercentage.toFixed(1)}%`,
      caption: `${formatCents(stats.projectedReturnCents)} sobre o capital`,
    },
  ]

  const evolutionSeries = buildEvolutionSeries(stats.estimatedValueCents)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {cards.map(card => (
          <div key={card.label} className="border border-zinc-200 bg-zinc-50 rounded-lg p-5">
            <p className="text-sm text-zinc-500 mb-1">{card.label}</p>
            <p className="text-2xl font-semibold text-zinc-900 mb-1">{card.value}</p>
            <p className="text-xs text-zinc-500">{card.caption}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="border border-zinc-200 bg-zinc-50 rounded-lg p-5">
          <div className="flex items-baseline gap-2 mb-4 flex-wrap">
            <h2 className="text-base font-semibold text-zinc-900">Evolução do portfolio</h2>
            <span className="text-xs text-zinc-500">Valor estimado · últimos 6 meses</span>
          </div>
          {stats.investedCents === 0 ? (
            <p className="text-sm text-zinc-500">Ainda não há dados suficientes para mostrar evolução.</p>
          ) : (
            <>
              <EvolutionChart data={evolutionSeries} />
              <p className="text-[11px] text-zinc-400 mt-2">
                Dados de demonstração — não reflete a evolução real mês a mês.
              </p>
            </>
          )}
        </div>

        <div className="border border-zinc-200 bg-zinc-50 rounded-lg p-5">
          <h2 className="text-base font-semibold text-zinc-900 mb-4">Distribuição</h2>
          {stats.distribution.length === 0 ? (
            <p className="text-sm text-zinc-500">Sem investimentos ativos para distribuir.</p>
          ) : (
            <DistributionChart
              distribution={stats.distribution}
              totalLabel={formatCents(stats.investedCents)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
