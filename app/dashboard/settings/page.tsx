import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from './SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: member } = await supabase
    .from('team_members')
    .select('*, organizations(name, slug)')
    .eq('auth_user_id', user.id)
    .single()

  if (!member) redirect('/auth/login')

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Definições</h1>
        <p className="text-slate-500 mt-1">Perfil e configurações da conta</p>
      </div>
      <SettingsForm member={member} userEmail={user.email ?? ''} />
    </div>
  )
}
