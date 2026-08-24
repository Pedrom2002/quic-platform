import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { type Route } from 'next'
import { Send } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'

export default async function CampaignsPage() {
  const supabase = await createClient()

  const { data: campaigns } = await supabase
    .from('marketing_campaigns')
    .select('id, name, status, scheduled_at, created_at, marketing_lists(name)')
    .order('created_at', { ascending: false })

  const STATUS_LABELS: Record<string, string> = {
    draft: 'Rascunho', scheduled: 'Agendada', sending: 'A enviar', sent: 'Enviada', paused: 'Pausada',
  }

  const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'subtle'> = {
    draft: 'secondary',
    scheduled: 'outline',
    sending: 'default',
    sent: 'subtle',
    paused: 'destructive',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Campanhas</h1>
        <ButtonLink href="/dashboard/marketing/campaigns/new">
          Nova Campanha
        </ButtonLink>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Lista</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns?.map(c => (
            <TableRow key={c.id}>
              <TableCell>
                <Link href={`/dashboard/marketing/campaigns/${c.id}` as Route}
                  className="font-medium hover:underline">{c.name}</Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {(c.marketing_lists as { name?: string } | null)?.name ?? '—'}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[c.status] ?? 'secondary'}>
                  {STATUS_LABELS[c.status] ?? c.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(c.scheduled_at ?? c.created_at).toLocaleDateString('pt-PT')}
              </TableCell>
            </TableRow>
          ))}
          {!campaigns?.length && (
            <TableRow>
              <TableCell colSpan={4}>
                <EmptyState icon={Send} message="Nenhuma campanha ainda." />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
