import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CampaignMetrics } from '@/components/marketing/CampaignMetrics'
import { InsightsCard } from '@/components/marketing/InsightsCard'
import { OpenHeatmap } from '@/components/marketing/OpenHeatmap'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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
    .select('id, status, sent_at, opened_at, replied_at, reply_snippet, bot_suspected, marketing_contacts(name, company, email, engagement_score)')
    .eq('campaign_id', id)
    .order('sent_at', { ascending: false })

  const realOpens = (sends ?? [])
    .filter(s => s.opened_at && !s.bot_suspected)
    .map(s => ({ opened_at: s.opened_at as string }))

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

  const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'subtle'> = {
    pending: 'secondary',
    sent: 'outline',
    opened: 'default',
    clicked: 'default',
    replied: 'subtle',
    bounced: 'destructive',
    unsubscribed: 'secondary',
    failed: 'destructive',
  }

  // opened/clicked partilham a variante "default" mas mantêm cores distintas
  // do design original (funil de progressão), sem variante shadcn dedicada.
  const STATUS_CLASSNAMES: Record<string, string> = {
    opened: 'bg-purple-100 text-purple-700',
    clicked: 'bg-indigo-100 text-indigo-700',
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

      <OpenHeatmap opens={realOpens} />

      <InsightsCard campaignId={id} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Contacto</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Enviado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sends?.map(s => {
            const contact = s.marketing_contacts as { name?: string; company?: string; email?: string; engagement_score?: number } | null
            return (
              <TableRow key={s.id}>
                <TableCell>{contact?.name ?? contact?.email}</TableCell>
                <TableCell className="text-muted-foreground">{contact?.company ?? '—'}</TableCell>
                <TableCell>
                  <Badge
                    variant={STATUS_VARIANTS[s.status] ?? 'secondary'}
                    className={STATUS_CLASSNAMES[s.status]}
                  >
                    {STATUS_LABELS[s.status] ?? s.status}
                  </Badge>
                  {s.bot_suspected && (
                    <span className="ml-1 text-[10px] text-zinc-400 uppercase tracking-wide" title="Open detetado via proxy (Apple/Gmail)">proxy</span>
                  )}
                </TableCell>
                <TableCell>{contact?.engagement_score ?? 0}</TableCell>
                <TableCell className="text-muted-foreground">
                  {s.sent_at ? new Date(s.sent_at).toLocaleDateString('pt-PT') : '—'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
