import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Users2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  member: 'Membro',
}

// cores do design original, sem variante shadcn dedicada por role.
const roleClassNames: Record<string, string> = {
  admin: 'bg-red-50 text-red-700 border-red-200',
  manager: 'bg-blue-50 text-blue-700 border-blue-200',
  member: 'bg-slate-50 text-slate-600 border-slate-200',
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  planning: 'bg-amber-50 text-amber-700',
  completed: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-50 text-red-400',
}

const statusLabels: Record<string, string> = {
  active: 'Ativo',
  planning: 'Planeamento',
  completed: 'Concluido',
  cancelled: 'Cancelado',
}

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: member } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!member) redirect('/auth/login')

  // Load all active team members for the org
  const { data: members } = await supabase
    .from('team_members')
    .select('id, full_name, email, role')
    .eq('organization_id', member.organization_id)
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  // Load all team assignments with event info (RLS already scopes by org)
  type AssignmentRow = { team_member_id: string; event: { id: string; name: string; status: string } | null }
  const { data: allAssignments } = await supabase
    .from('event_team_assignments')
    .select('team_member_id, event:events!event_id(id, name, status)')
    .returns<AssignmentRow[]>()

  const assignmentMap = new Map<string, { id: string; name: string; status: string }[]>()
  for (const a of allAssignments ?? []) {
    const ev = a.event
    if (!ev) continue
    const list = assignmentMap.get(a.team_member_id) ?? []
    list.push(ev)
    assignmentMap.set(a.team_member_id, list)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Equipa</h1>
          <p className="text-slate-500 mt-1">{members?.length ?? 0} membros ativos</p>
        </div>
      </div>

      {!members?.length ? (
        <div className="text-center py-16">
          <Users2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">Nenhum membro na equipa.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {members.map(m => {
            const initials = m.full_name.split(' ').filter(Boolean).slice(0, 2).map((n: string) => n[0].toUpperCase()).join('')
            const events = assignmentMap.get(m.id) ?? []
            const activeEvents = events.filter(e => e.status === 'active' || e.status === 'planning')
            return (
              <div key={m.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <span className="text-slate-600 font-semibold text-sm">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-slate-900 font-semibold">{m.full_name}</p>
                      <Badge
                        variant="outline"
                        className={roleClassNames[m.role] ?? 'bg-slate-50 text-slate-600 border-slate-200'}
                      >
                        {roleLabels[m.role] ?? m.role}
                      </Badge>
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5">{m.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-slate-900 font-bold text-lg">{activeEvents.length}</p>
                    <p className="text-slate-400 text-xs">eventos ativos</p>
                  </div>
                </div>
                {events.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                    {events.map(ev => (
                      <Link
                        key={ev.id}
                        href={`/dashboard/events/${ev.id}`}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-600"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColors[ev.status]?.split(' ')[0] ?? 'bg-slate-300'}`} />
                        {ev.name}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColors[ev.status] ?? ''}`}>
                          {statusLabels[ev.status] ?? ev.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
