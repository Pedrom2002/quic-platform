import { createClient } from '@/lib/supabase/server'
import { saveSmtpCredentials } from './actions'

export default async function MarketingSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: creds } = await supabase
    .from('team_smtp_credentials')
    .select('host, port, username, from_name, verified_at')
    .eq('user_id', user!.id)
    .maybeSingle()

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-xl font-semibold mb-6">Configurações SMTP</h1>
      {creds?.verified_at && (
        <p className="text-sm text-green-600 mb-4">
          Ligação verificada em {new Date(creds.verified_at).toLocaleDateString('pt-PT')}
        </p>
      )}
      <form action={saveSmtpCredentials} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nome do remetente</label>
          <input name="from_name" defaultValue={creds?.from_name ?? ''} required
            className="w-full border rounded px-3 py-2 text-sm" placeholder="Pedro Silva" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Servidor SMTP</label>
          <input name="host" defaultValue={creds?.host ?? ''} required
            className="w-full border rounded px-3 py-2 text-sm" placeholder="mail.quic.pt" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Porta</label>
          <input name="port" type="number" defaultValue={creds?.port ?? 587} required
            className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email (username)</label>
          <input name="username" defaultValue={creds?.username ?? ''} required type="email"
            className="w-full border rounded px-3 py-2 text-sm" placeholder="pedro@quic.pt" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input name="password" type="password" required
            className="w-full border rounded px-3 py-2 text-sm" placeholder="••••••••" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit"
            className="bg-zinc-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-zinc-700">
            Guardar
          </button>
        </div>
      </form>
    </div>
  )
}
