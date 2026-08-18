import { createClient } from '@/lib/supabase/server'
import { PortfolioTable, type PortfolioRow } from './PortfolioTable'

const currencyFormatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })

function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

const PHASE_LABELS: Record<string, string> = {
  coming_soon: 'Brevemente',
  open: 'Em venda',
  closed: 'Produção',
  completed: 'Settlement',
}

const PHASE_CLASSES: Record<string, string> = {
  coming_soon: 'bg-zinc-100 text-zinc-600',
  open: 'bg-sky-50 text-sky-700',
  closed: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
}

const NEXT_MILESTONE: Record<string, string> = {
  coming_soon: 'Abertura brevemente',
  open: 'Fecho early bird',
  closed: 'Fecho de patrocinadores',
  completed: 'Distribuição',
}

const SALES_STATUS_LABELS: Record<string, string> = {
  coming_soon: 'Brevemente disponível',
  open: 'Vendas abertas',
  closed: 'Em produção',
  completed: 'Concluído',
}

function phaseLabel(projectStatus: string | undefined): string {
  return PHASE_LABELS[projectStatus ?? ''] ?? 'Sem fase'
}

function phaseClasses(projectStatus: string | undefined): string {
  return PHASE_CLASSES[projectStatus ?? ''] ?? 'bg-zinc-100 text-zinc-600'
}

function nextMilestone(projectStatus: string | undefined): string {
  return NEXT_MILESTONE[projectStatus ?? ''] ?? '—'
}

function salesStatusLabel(projectStatus: string | undefined): string {
  return SALES_STATUS_LABELS[projectStatus ?? ''] ?? 'Sem estado'
}

export default async function InvestorPortfolioPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('investments')
    .select('id, amount_cents, status, projected_return_cents, investment_projects(name, status)')
    .order('invested_at', { ascending: false })

  const investments = data ?? []
  const totalCents = investments.reduce((sum, inv) => sum + inv.amount_cents, 0)
  const activeCount = investments.filter(inv => inv.status === 'active').length

  const rows: PortfolioRow[] = investments.map(inv => ({
    id: inv.id,
    projectName: inv.investment_projects?.name ?? 'Projeto sem nome',
    phaseLabel: phaseLabel(inv.investment_projects?.status),
    phaseClasses: phaseClasses(inv.investment_projects?.status),
    salesStatusLabel: salesStatusLabel(inv.investment_projects?.status),
    amountCents: inv.amount_cents,
    returnPercentage:
      inv.projected_return_cents != null && inv.amount_cents > 0
        ? (inv.projected_return_cents / inv.amount_cents) * 100
        : null,
    nextMilestone: nextMilestone(inv.investment_projects?.status),
    investmentStatus: inv.status,
  }))

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

          <PortfolioTable investments={rows} />
        </>
      )}
    </div>
  )
}
