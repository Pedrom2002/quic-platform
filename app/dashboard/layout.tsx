import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Toaster } from '@/components/ui/sonner'

type MemberWithOrg = {
  full_name: string
  organizations: { name: string } | null
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: member } = await supabase
    .from('team_members')
    .select('full_name, organizations(name)')
    .eq('auth_user_id', user.id)
    .returns<MemberWithOrg[]>()
    .single()

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar
        userName={member?.full_name ?? user.email ?? 'Utilizador'}
        userEmail={user.email ?? ''}
        orgName={member?.organizations?.name ?? 'Quic'}
      />
      <main className="flex-1 overflow-auto flex flex-col">
        {children}
      </main>
      <Toaster richColors theme="light" />
    </div>
  )
}
