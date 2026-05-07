import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Toaster } from '@/components/ui/sonner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: member } = await supabase
    .from('team_members')
    .select('full_name, organizations(name)')
    .eq('auth_user_id', user.id)
    .single()

  const orgRaw = member?.organizations as unknown
  const org: { name: string } | null = Array.isArray(orgRaw)
    ? (orgRaw[0] ?? null)
    : (orgRaw as { name: string } | null) ?? null

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar
        userName={member?.full_name ?? user.email ?? 'Utilizador'}
        userEmail={user.email ?? ''}
        orgName={org?.name ?? 'Quic'}
      />
      <main className="flex-1 overflow-auto flex flex-col">
        {children}
      </main>
      <Toaster richColors theme="light" />
    </div>
  )
}
