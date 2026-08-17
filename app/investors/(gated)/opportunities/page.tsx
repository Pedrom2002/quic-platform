import Link from 'next/link'
import type { Route } from 'next'
import { createClient } from '@/lib/supabase/server'

const currencyFormatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
const dateFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })

function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

export default async function InvestorOpportunitiesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('investment_projects')
    .select('id, name, description, funding_goal_cents, investment_deadline')
    .eq('status', 'open')
    .order('investment_deadline', { ascending: true, nullsFirst: false })

  const projects = data ?? []

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Opportunities</h1>
      {projects.length === 0 ? (
        <p className="text-zinc-500">Sem oportunidades disponíveis de momento.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <Link
              key={project.id}
              href={`/investors/opportunities/${project.id}` as Route}
              className="block border border-zinc-200 bg-zinc-50 rounded-lg p-5 hover:border-zinc-300 hover:shadow-sm transition-shadow"
            >
              <h2 className="text-lg font-semibold text-zinc-900 mb-2">{project.name}</h2>
              {project.description && (
                <p className="text-sm text-zinc-500 mb-4 line-clamp-2">{project.description}</p>
              )}
              <div className="flex items-center justify-between border-t border-zinc-200 pt-3">
                <div>
                  <p className="text-xs text-zinc-500">Meta</p>
                  <p className="text-sm font-semibold text-zinc-900">{formatCents(project.funding_goal_cents)}</p>
                </div>
                {project.investment_deadline && (
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Prazo</p>
                    <p className="text-sm font-medium text-zinc-700">
                      {dateFormatter.format(new Date(project.investment_deadline))}
                    </p>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
