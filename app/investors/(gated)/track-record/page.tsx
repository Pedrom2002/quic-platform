import { createClient } from '@/lib/supabase/server'

const currencyFormatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })

function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

export default async function InvestorTrackRecordPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('investment_projects')
    .select('id, name, funding_goal_cents, actual_revenue_cents, attendance, created_at')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  const projects = data ?? []

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-white mb-6">Track Record</h1>
      {projects.length === 0 ? (
        <p className="text-zinc-400">Ainda não há projetos concluídos para mostrar.</p>
      ) : (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Projeto</th>
                <th className="text-left px-4 py-3 font-medium">Meta</th>
                <th className="text-left px-4 py-3 font-medium">Receita Real</th>
                <th className="text-left px-4 py-3 font-medium">Assistência</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(project => (
                <tr key={project.id} className="border-t border-zinc-800">
                  <td className="px-4 py-3 text-white">{project.name}</td>
                  <td className="px-4 py-3 text-zinc-300">{formatCents(project.funding_goal_cents)}</td>
                  <td className="px-4 py-3 text-zinc-300">
                    {project.actual_revenue_cents != null ? formatCents(project.actual_revenue_cents) : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {project.attendance != null ? project.attendance : '—'}
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
