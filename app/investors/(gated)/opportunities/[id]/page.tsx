import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const currencyFormatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
const dateFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })

function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

export default async function InvestorOpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: project } = await supabase
    .from('investment_projects')
    .select('id, name, description, funding_goal_cents, capacity, investment_deadline, status')
    .eq('id', id)
    .single()

  if (!project || project.status !== 'open') notFound()

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-4">{project.name}</h1>
      {project.description && (
        <p className="text-zinc-700 mb-6 whitespace-pre-wrap">{project.description}</p>
      )}
      <div className="border border-zinc-200 bg-zinc-50 rounded-lg p-5 space-y-2">
        <p className="text-sm text-zinc-700">Meta de financiamento: {formatCents(project.funding_goal_cents)}</p>
        {project.capacity != null && (
          <p className="text-sm text-zinc-700">Capacidade: {project.capacity}</p>
        )}
        {project.investment_deadline && (
          <p className="text-sm text-zinc-700">
            Prazo: {dateFormatter.format(new Date(project.investment_deadline))}
          </p>
        )}
      </div>
    </div>
  )
}
