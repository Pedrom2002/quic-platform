import { redirect } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Toaster } from '@/components/ui/sonner'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dashboard-sans',
})

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
    <div className={`${poppins.variable} flex h-screen bg-slate-50 font-sans`} style={{ fontFamily: 'var(--font-dashboard-sans)' }}>
      <a href="#main-content" className="skip-link">
        Saltar para o conteúdo
      </a>
      <Sidebar
        userName={member?.full_name ?? user.email ?? 'Utilizador'}
        userEmail={user.email ?? ''}
        orgName={member?.organizations?.name ?? 'Quic'}
      />
      <main id="main-content" className="flex-1 overflow-auto flex flex-col">
        {children}
      </main>
      <Toaster richColors theme="light" />
    </div>
  )
}
