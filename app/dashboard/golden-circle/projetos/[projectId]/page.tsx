import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { InvestmentProject } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { ProjectForm } from '../project-form'
import { InvestmentCreateDialog } from './investment-create-dialog'

const currencyFormatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
const dateFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })

function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

export default async function GoldenCircleProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data } = await supabase.from('investment_projects').select('*').eq('id', projectId).single()
  if (!data) notFound()
  const project = data as InvestmentProject

  const { data: investmentsData } = await supabase
    .from('investments')
    .select('id, amount_cents, invested_at, status, projected_return_cents, investors(full_name)')
    .eq('project_id', projectId)
    .order('invested_at', { ascending: false })
  const investments = investmentsData ?? []

  const { data: documentsData } = await supabase
    .from('investor_documents')
    .select('id, title, type, file_url, uploaded_at')
    .eq('project_id', projectId)
    .order('uploaded_at', { ascending: false })
  const documents = documentsData ?? []

  const { data: approvedInvestorsData } = await supabase
    .from('investors')
    .select('id, full_name')
    .eq('status', 'approved')
  const approvedInvestors = approvedInvestorsData ?? []

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{project.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectForm project={project} />
        </CardContent>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Investimentos</h2>
          <InvestmentCreateDialog projectId={projectId} approvedInvestors={approvedInvestors} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Investidor</TableHead>
              <TableHead>Montante</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {investments.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Sem investimentos.
                </TableCell>
              </TableRow>
            )}
            {investments.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>{inv.investors?.full_name ?? '-'}</TableCell>
                <TableCell>{formatCents(inv.amount_cents)}</TableCell>
                <TableCell>{dateFormatter.format(new Date(inv.invested_at))}</TableCell>
                <TableCell>{inv.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Documentos</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Sem documentos.
                </TableCell>
              </TableRow>
            )}
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {doc.title}
                  </a>
                </TableCell>
                <TableCell>{doc.type}</TableCell>
                <TableCell>{dateFormatter.format(new Date(doc.uploaded_at))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
