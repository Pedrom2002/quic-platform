import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CampaignMetrics } from '@/components/marketing/CampaignMetrics'
import { InsightsCard } from '@/components/marketing/InsightsCard'

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('marketing_campaigns')
    .select('*, marketing_lists(name)')
    .eq('id', id)
    .single()

  if (!campaign) notFound()

  const { data: sends } = await supabase
    .from('marketing_sends')
    .select('id, status, sent_at, replied_at, reply_snippet, bot_suspected, marketing_contacts(name, company, email, engagement_score)')
    .eq('campaign_id', id)
    .order('sent_at', { ascending: false })

  const total = sends?.length ?? 0
  const sent = sends?.filter(s => s.status !== 'pending').length ?? 0
  const opened = sends?.filter(s => ['opened', 'clicked', 'replied'].includes(s.status)).length ?? 0
  const clicked = sends?.filter(s => s.status === 'clicked').length ?? 0
  const replied = sends?.filter(s => s.status === 'replied' || s.replied_at).length ?? 0
  const bounced = sends?.filter(s => s.status === 'bounced').length ?? 0
  const unsubscribed = sends?.filter(s => s.status === 'unsubscribed').length ?? 0

  const repliesList = (sends ?? []).filter(s => s.replied_at)

  const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendente', sent: 'Enviado', opened: 'Aberto',
    clicked: 'Clicado', replied: 'Respondeu',
    bounced: 'Bounce', unsubscribed: 'Cancelado', failed: 'Erro',
  }

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-zinc-100 text-zinc-600',
    sent: 'bg-blue-100 text-blue-700',
    opened: 'bg-purple-100 text-purple-700',
    clicked: 'bg-indigo-100 text-indigo-700',
    replied: 'bg-emerald-100 text-emerald-700',
    bounced: 'bg-red-100 text-red-700',
    unsubscribed: 'bg-zinc-200 text-zinc-700',
    failed: 'bg-red-200 text-red-800',
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">{campaign.name}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Lista: {(campaign.marketing_lists as { name?: string } | null)?.name}
        </p>
      </div>

      <CampaignMetrics total={total} sent={sent} opened={opened}
        clicked={clicked} replied={replied} bounced={bounced} unsubscribed={unsubscribed} />

      {repliesList.length > 0 && (
        <div className="mb-8 border-2 border-emerald-200 bg-emerald-50/50 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-emerald-900 mb-3 flex items-center gap-2">
            {repliesList.length} {repliesList.length === 1 ? 'resposta recebida' : 'respostas recebidas'}
          </h2>
          <div className="space-y-3">
            {repliesList.map(s => {
              const contact = s.marketing_contacts as { name?: string; email?: string; company?: string } | null
              return (
                <div key={s.id} className="bg-white border rounded p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">
                      {contact?.name ?? contact?.email}
                      {contact?.company && <span className="text-zinc-500 font-normal"> — {contact.company}</span>}
                    </p>
                    <span className="text-xs text-zinc-500">
                      {s.replied_at ? new Date(s.replied_at).toLocaleString('pt-PT') : ''}
                    </span>
                  </div>
                  {s.reply_snippet && (
                    <p className="text-sm text-zinc-600 italic">&ldquo;{s.reply_snippet}&rdquo;</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <InsightsCard campaignId={id} />

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Contacto</th>
              <th className="text-left px-4 py-3 font-medium">Empresa</th>
              <th className="text-left px-4 py-3 font-medium">Estado</th>
              <th className="text-left px-4 py-3 font-medium">Score</th>
              <th className="text-left px-4 py-3 font-medium">Enviado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sends?.map(s => {
              const contact = s.marketing_contacts as { name?: string; company?: string; email?: string; engagement_score?: number } | null
              return (
                <tr key={s.id}>
                  <td className="px-4 py-3">{contact?.name ?? contact?.email}</td>
                  <td className="px-4 py-3 text-zinc-500">{contact?.company ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[s.status] ?? 'bg-zinc-100'}`}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                    {s.bot_suspected && (
                      <span className="ml-1 text-[10px] text-zinc-400 uppercase tracking-wide" title="Open detetado via proxy (Apple/Gmail)">proxy</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{contact?.engagement_score ?? 0}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {s.sent_at ? new Date(s.sent_at).toLocaleDateString('pt-PT') : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
