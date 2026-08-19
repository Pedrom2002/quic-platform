import Link from 'next/link'
import type { Route } from 'next'

import { createClient } from '@/lib/supabase/server'
import { DOCUMENT_TYPES } from '@/lib/golden-circle/validation'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { DocumentCreateDialog } from './document-create-dialog'

const dateFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })

const TYPE_LABELS: Record<string, string> = {
  contract: 'Contrato',
  report: 'Relatório',
  tax: 'Fiscal',
  presentation: 'Apresentação',
}

export default async function GoldenCircleDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('investor_documents')
    .select('id, title, type, file_url, uploaded_at, investors(full_name), investment_projects(name)')
    .order('uploaded_at', { ascending: false })

  if (type && type !== 'all') {
    query = query.eq('type', type)
  }

  const { data: documentsData } = await query
  const documents = documentsData ?? []

  const { data: investorsData } = await supabase.from('investors').select('id, full_name').eq('status', 'approved')
  const investors = investorsData ?? []

  const { data: projectsData } = await supabase.from('investment_projects').select('id, name')
  const projects = projectsData ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1">
          {(['all', ...DOCUMENT_TYPES] as const).map((t) => (
            <Link
              key={t}
              href={(t === 'all' ? '/dashboard/golden-circle/documentos' : `/dashboard/golden-circle/documentos?type=${t}`) as Route}
              className="rounded-full border px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
            >
              {t === 'all' ? 'Todos' : TYPE_LABELS[t]}
            </Link>
          ))}
        </div>
        <DocumentCreateDialog investors={investors} projects={projects} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Associado a</TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
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
              <TableCell><Badge>{TYPE_LABELS[doc.type] ?? doc.type}</Badge></TableCell>
              <TableCell>{doc.investors?.full_name ?? doc.investment_projects?.name ?? '-'}</TableCell>
              <TableCell>{dateFormatter.format(new Date(doc.uploaded_at))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
