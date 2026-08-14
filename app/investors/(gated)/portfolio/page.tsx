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
  active: 'bg-emerald-950/40 text-emerald-400 border-emerald-900',
  returned: 'bg-sky-950/40 text-sky-400 border-sky-900',
  written_off: 'bg-red-950/40 text-red-400 border-red-900',
}

function statusBadgeLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

function statusBadgeClasses(status: string): string {
  return STATUS_CLASSES[status] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'
}

export default async function InvestorPortfolioPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('investments')
    .select('id, amount_cents, invested_at, status, investment_projects(name)')
    .order('invested_at', { ascending: false })

  const investments = data ?? []

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-white mb-6">Portfolio</h1>
      {investments.length === 0 ? (
        <p className="text-zinc-400">Ainda não tens investimentos.</p>
      ) : (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Projeto</th>
                <th className="text-left px-4 py-3 font-medium">Valor</th>
                <th className="text-left px-4 py-3 font-medium">Data</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {investments.map(investment => (
                <tr key={investment.id} className="border-t border-zinc-800">
                  <td className="px-4 py-3 text-white">{investment.investment_projects?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-300">{formatCents(investment.amount_cents)}</td>
                  <td className="px-4 py-3 text-zinc-300">
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
      )}
    </div>
  )
}
