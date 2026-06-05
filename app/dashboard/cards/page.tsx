import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CreditCard } from 'lucide-react'

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  member: 'Membro',
}

export default async function CardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: me } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!me) redirect('/auth/login')

  const { data: members } = await supabase
    .from('team_members')
    .select('id, full_name, email, role')
    .eq('organization_id', me.organization_id)
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cards</h1>
          <p className="text-slate-500 mt-1">Cartões digitais da equipa</p>
        </div>
      </div>

      {!members?.length ? (
        <div className="text-center py-16">
          <CreditCard className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">Nenhum membro na equipa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {members.map(m => {
            const initials = m.full_name
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((n: string) => n[0].toUpperCase())
              .join('')
            return (
              <Link
                key={m.id}
                href={`/dashboard/cards/${m.id}` as import('next').Route}
                className="group bg-white border border-slate-200 rounded-xl shadow-sm p-5 hover:shadow-md hover:border-slate-300 transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <span className="text-slate-600 font-semibold text-sm">{initials}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-900 font-semibold truncate">{m.full_name}</p>
                    <p className="text-xs text-slate-400 truncate">{roleLabels[m.role] ?? m.role}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 truncate mb-3">{m.email}</p>
                <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors">
                  Ver cartão
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
