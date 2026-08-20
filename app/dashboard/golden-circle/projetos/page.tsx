import Link from 'next/link'
import type { Route } from 'next'

import { createClient } from '@/lib/supabase/server'
import type { InvestmentProject } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { ProjectCreateDialog } from './project-create-dialog'
import { formatCents } from '@/lib/format-money'

const dateFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })

const STATUS_LABELS: Record<string, string> = {
  coming_soon: 'Brevemente',
  open: 'Em venda',
  closed: 'Fechado',
  completed: 'Concluído',
}

export default async function GoldenCircleProjectsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('investment_projects')
    .select('id, name, status, funding_goal_cents, investment_deadline')
    .order('created_at', { ascending: false })
  const projects = (data ?? []) as unknown as InvestmentProject[]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <ProjectCreateDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Meta</TableHead>
            <TableHead>Prazo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Sem projetos. Cria o primeiro.
              </TableCell>
            </TableRow>
          )}
          {projects.map((project) => (
            <TableRow key={project.id}>
              <TableCell className="font-medium">
                <Link href={`/dashboard/golden-circle/projetos/${project.id}` as Route} className="hover:underline">
                  {project.name}
                </Link>
              </TableCell>
              <TableCell><Badge>{STATUS_LABELS[project.status] ?? project.status}</Badge></TableCell>
              <TableCell>{formatCents(project.funding_goal_cents)}</TableCell>
              <TableCell>
                {project.investment_deadline ? dateFormatter.format(new Date(project.investment_deadline)) : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
