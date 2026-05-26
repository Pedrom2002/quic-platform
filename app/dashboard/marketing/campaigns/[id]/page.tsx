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
    .select('id, status, sent_at, marketing_contacts(name, company, email, engagement_score)')
    .eq('campaign_id', id)
    .order('sent_at', { ascending: false })

  const total = sends?.length ?? 0
  const sent = sends?.filter(s => s.status !== 'pending').length ?? 0
  const opened = sends?.filter(s => ['opened', 'clicked'].includes(s.status)).length ?? 0
  const clicked = sends?.filter(s => s.status === 'clicked').length ?? 0
  const bounced = sends?.filter(s => s.status === 'bounced').length ?? 0
  const unsubscribed = sends?.filter(s => s.status === 'unsubscribed').length ?? 0

  const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendente', sent: 'Enviado', opened: 'Aberto',
    clicked: 'Clicado', bounced: 'Bounce', unsubscribed: 'Cancelado', failed: 'Erro',
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
        clicked={clicked} bounced={bounced} unsubscribed={unsubscribed} />

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
                  <td className="px-4 py-3">{STATUS_LABELS[s.status]}</td>
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
