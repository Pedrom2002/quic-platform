import { getInvestorDashboardStats } from './actions'

const currencyFormatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })

function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

export default async function InvestorDashboardPage() {
  const stats = await getInvestorDashboardStats()

  const cards = [
    { label: 'Capital investido', value: formatCents(stats.investedCents) },
    { label: 'Projetos ativos', value: `${stats.activeProjects} projeto${stats.activeProjects === 1 ? '' : 's'}` },
    { label: 'Retorno realizado', value: formatCents(stats.realizedReturnCents) },
    { label: 'Retorno projetado', value: formatCents(stats.projectedReturnCents) },
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className="border border-zinc-200 bg-zinc-50 rounded-lg p-5">
            <p className="text-sm text-zinc-500 mb-1">{card.label}</p>
            <p className="text-2xl font-semibold text-zinc-900">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
