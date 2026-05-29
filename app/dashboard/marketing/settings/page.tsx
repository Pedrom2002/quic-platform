import { createClient } from '@/lib/supabase/server'
import { saveSmtpCredentials } from './actions'
import { SettingsForm } from './SettingsForm'

export default async function MarketingSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: creds } = await supabase
    .from('team_smtp_credentials')
    .select('host, port, username, from_name, verified_at')
    .eq('user_id', user!.id)
    .maybeSingle()

  const { data: member } = await supabase
    .from('team_members')
    .select('full_name')
    .eq('auth_user_id', user!.id)
    .maybeSingle()

  const defaultHost = creds?.host ?? 'mail.quic.pt'
  const defaultPort = creds?.port ?? 465
  const defaultUsername = creds?.username ?? user?.email ?? ''
  const defaultFromName = creds?.from_name ?? member?.full_name ?? ''

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-xl font-semibold mb-2">Configurações SMTP</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Configura o teu email <code className="text-xs bg-zinc-100 px-1 py-0.5 rounded">@quic.pt</code> para envio de campanhas.
      </p>

      {creds?.verified_at && (
        <div className="mb-4 px-3 py-2 rounded bg-green-50 border border-green-200 text-sm text-green-700">
          ✓ Ligação verificada em {new Date(creds.verified_at).toLocaleDateString('pt-PT')}
        </div>
      )}

      <SettingsForm
        action={saveSmtpCredentials}
        defaults={{
          host: defaultHost,
          port: defaultPort,
          username: defaultUsername,
          from_name: defaultFromName,
        }}
      />
    </div>
  )
}
