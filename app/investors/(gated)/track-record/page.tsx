import { createClient } from '@/lib/supabase/server'
import { formatCents } from '@/lib/format-money'

export default async function InvestorTrackRecordPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('investment_projects')
    .select('id, name, funding_goal_cents, actual_revenue_cents, attendance, created_at')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  const projects = data ?? []
  const totalRevenueCents = projects.reduce((sum, p) => sum + (p.actual_revenue_cents ?? 0), 0)
  const totalAttendance = projects.reduce((sum, p) => sum + (p.attendance ?? 0), 0)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Track Record</h1>
      {projects.length === 0 ? (
        <p className="text-zinc-500">Ainda não há projetos concluídos para mostrar.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="border border-zinc-200 bg-zinc-50 rounded-lg p-5">
              <p className="text-sm text-zinc-500 mb-1">Projetos concluídos</p>
              <p className="text-2xl font-semibold text-zinc-900">{projects.length}</p>
            </div>
            <div className="border border-zinc-200 bg-zinc-50 rounded-lg p-5">
              <p className="text-sm text-zinc-500 mb-1">Receita total</p>
              <p className="text-2xl font-semibold text-zinc-900">{formatCents(totalRevenueCents)}</p>
            </div>
            <div className="border border-zinc-200 bg-zinc-50 rounded-lg p-5">
              <p className="text-sm text-zinc-500 mb-1">Assistência total</p>
              <p className="text-2xl font-semibold text-zinc-900">{totalAttendance}</p>
            </div>
          </div>

          <div className="border border-zinc-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[36rem]">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Projeto</th>
                  <th className="text-left px-4 py-3 font-medium">Meta</th>
                  <th className="text-left px-4 py-3 font-medium">Receita Real</th>
                  <th className="text-left px-4 py-3 font-medium">Assistência</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(project => (
                  <tr key={project.id} className="border-t border-zinc-200 hover:bg-zinc-50">
                    <td className="px-4 py-3 text-zinc-900">{project.name}</td>
                    <td className="px-4 py-3 text-zinc-700">{formatCents(project.funding_goal_cents)}</td>
                    <td className="px-4 py-3 text-zinc-700">
                      {project.actual_revenue_cents != null ? formatCents(project.actual_revenue_cents) : '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {project.attendance != null ? project.attendance : '—'}
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
