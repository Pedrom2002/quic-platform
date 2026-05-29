import { createClient } from '@/lib/supabase/server'
import { saveSmtpCredentials } from './actions'
import { SettingsForm } from './SettingsForm'
import { checkSenderDns } from '@/lib/marketing/dns-check'

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
          Ligação verificada em {new Date(creds.verified_at).toLocaleDateString('pt-PT')}
        </div>
      )}

      {creds?.username && (
        <DnsStatus email={creds.username} />
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

async function DnsStatus({ email }: { email: string }) {
  const dns = await checkSenderDns(email)
  const items = [
    { key: 'SPF', state: dns.spf },
    { key: 'DKIM', state: dns.dkim },
    { key: 'DMARC', state: dns.dmarc, extra: dns.dmarc.policy ? `política: ${dns.dmarc.policy}` : undefined },
  ]
  return (
    <div className="mb-6 border rounded-lg p-4">
      <p className="text-sm font-medium mb-3">Autenticação DNS de <code className="text-xs bg-zinc-100 px-1 rounded">{dns.domain}</code></p>
      <div className="space-y-1.5">
        {items.map(i => (
          <div key={i.key} className="flex items-center justify-between text-sm">
            <span className="font-mono text-xs">{i.key}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              i.state.ok ? 'bg-green-100 text-green-700' :
              i.state.found ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {i.state.ok ? 'OK' : i.state.found ? 'fraco' : 'em falta'}
              {i.extra && ` — ${i.extra}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
