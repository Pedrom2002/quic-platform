import { createClient } from '@/lib/supabase/server'

const currencyFormatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
const dateFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })

function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  returned: 'Devolvido',
  written_off: 'Perdido',
}

const STATUS_CLASSES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  returned: 'bg-sky-50 text-sky-700 border-sky-200',
  written_off: 'bg-red-50 text-red-700 border-red-200',
}

function statusBadgeLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

function statusBadgeClasses(status: string): string {
  return STATUS_CLASSES[status] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'
}

export default async function InvestorPortfolioPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('investments')
    .select('id, amount_cents, invested_at, status, investment_projects(name)')
    .order('invested_at', { ascending: false })

  const investments = data ?? []
  const totalCents = investments.reduce((sum, inv) => sum + inv.amount_cents, 0)
  const activeCount = investments.filter(inv => inv.status === 'active').length

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Portfolio</h1>
      {investments.length === 0 ? (
        <p className="text-zinc-500">Ainda não tens investimentos.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="border border-zinc-200 bg-zinc-50 rounded-lg p-5">
              <p className="text-sm text-zinc-500 mb-1">Total investido</p>
              <p className="text-2xl font-semibold text-zinc-900">{formatCents(totalCents)}</p>
            </div>
            <div className="border border-zinc-200 bg-zinc-50 rounded-lg p-5">
              <p className="text-sm text-zinc-500 mb-1">Investimentos</p>
              <p className="text-2xl font-semibold text-zinc-900">{investments.length}</p>
            </div>
            <div className="border border-zinc-200 bg-zinc-50 rounded-lg p-5">
              <p className="text-sm text-zinc-500 mb-1">Ativos</p>
              <p className="text-2xl font-semibold text-zinc-900">{activeCount}</p>
            </div>
          </div>

          <div className="border border-zinc-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[36rem]">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Projeto</th>
                  <th className="text-left px-4 py-3 font-medium">Valor</th>
                  <th className="text-left px-4 py-3 font-medium">Data</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {investments.map(investment => (
                  <tr key={investment.id} className="border-t border-zinc-200 hover:bg-zinc-50">
                    <td className="px-4 py-3 text-zinc-900">{investment.investment_projects?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-700">{formatCents(investment.amount_cents)}</td>
                    <td className="px-4 py-3 text-zinc-700">
                      {dateFormatter.format(new Date(investment.invested_at))}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusBadgeClasses(investment.status)}`}>
                        {statusBadgeLabel(investment.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
