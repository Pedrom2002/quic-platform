// app/investors/(gated)/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/investors/Nav'

export default async function InvestorsGatedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/investors/login')

  const { data: investor } = await supabase
    .from('investors')
    .select('full_name, status')
    .eq('auth_user_id', user.id)
    .single()

  if (!investor || investor.status !== 'approved') redirect('/investors/pending')

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Nav userName={investor.full_name} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
