import { createClient } from '@/lib/supabase/server'

const currencyFormatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
const percentFormatter = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

function formatPercentage(percentage: number): string {
  return percentFormatter.format(percentage)
}

const STATUS_ORDER = ['active', 'returned', 'written_off'] as const

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  returned: 'Devolvido',
  written_off: 'Perdido',
}

const STATUS_CLASSES: Record<string, string> = {
  active: 'bg-emerald-950/40 text-emerald-400 border-emerald-900',
  returned: 'bg-sky-950/40 text-sky-400 border-sky-900',
  written_off: 'bg-red-950/40 text-red-400 border-red-900',
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

function statusClasses(status: string): string {
  return STATUS_CLASSES[status] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'
}

type StatusBreakdown = {
  status: string
  count: number
  totalCents: number
  percentage: number
}

function aggregateByStatus(
  investments: Array<{ amount_cents: number; status: string }>
): StatusBreakdown[] {
  const grandTotalCents = investments.reduce((sum, inv) => sum + inv.amount_cents, 0)

  return STATUS_ORDER.map(status => {
    const matching = investments.filter(inv => inv.status === status)
    const totalCents = matching.reduce((sum, inv) => sum + inv.amount_cents, 0)
    const percentage = grandTotalCents > 0 ? (totalCents / grandTotalCents) * 100 : 0

    return {
      status,
      count: matching.length,
      totalCents,
      percentage,
    }
  })
}

export default async function InvestorInsightsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('investments')
    .select('amount_cents, status')

  const investments = data ?? []

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-white mb-6">Insights</h1>
      {investments.length === 0 ? (
        <p className="text-zinc-400">Ainda não tens investimentos para analisar.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {aggregateByStatus(investments).map(breakdown => (
            <div key={breakdown.status} className="border border-zinc-800 bg-zinc-900 rounded-lg p-5">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusClasses(breakdown.status)}`}>
                {statusLabel(breakdown.status)}
              </span>
              <p className="text-sm text-zinc-400 mt-3">
                {`${breakdown.count} investimento${breakdown.count === 1 ? '' : 's'}`}
              </p>
              <p className="text-xl font-semibold text-white mt-1">{formatCents(breakdown.totalCents)}</p>
              <p className="text-sm text-zinc-400 mt-1">{`${formatPercentage(breakdown.percentage)}%`}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
