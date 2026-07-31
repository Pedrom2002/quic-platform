import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { type Route } from 'next'

export default async function CampaignsPage() {
  const supabase = await createClient()

  const { data: campaigns } = await supabase
    .from('marketing_campaigns')
    .select('id, name, status, scheduled_at, created_at, marketing_lists(name)')
    .order('created_at', { ascending: false })

  const STATUS_LABELS: Record<string, string> = {
    draft: 'Rascunho', scheduled: 'Agendada', sending: 'A enviar', sent: 'Enviada', paused: 'Pausada',
  }

  const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-zinc-100 text-zinc-600',
    scheduled: 'bg-blue-100 text-blue-700',
    sending: 'bg-yellow-100 text-yellow-700',
    sent: 'bg-green-100 text-green-700',
    paused: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Campanhas</h1>
        <Link href={'/dashboard/marketing/campaigns/new' as Route}
          className="bg-zinc-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-zinc-700">
          Nova Campanha
        </Link>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Nome</th>
              <th className="text-left px-4 py-3 font-medium">Lista</th>
              <th className="text-left px-4 py-3 font-medium">Estado</th>
              <th className="text-left px-4 py-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {campaigns?.map(c => (
              <tr key={c.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/marketing/campaigns/${c.id}` as Route}
                    className="font-medium hover:underline">{c.name}</Link>
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {(c.marketing_lists as { name?: string } | null)?.name ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                    {STATUS_LABELS[c.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(c.scheduled_at ?? c.created_at).toLocaleDateString('pt-PT')}
                </td>
              </tr>
            ))}
            {!campaigns?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">Nenhuma campanha ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
