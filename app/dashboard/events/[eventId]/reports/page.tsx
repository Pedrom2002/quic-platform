import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { AddReportDialog } from '@/components/events/reports/AddReportDialog'
import { DeleteReportButton } from '@/components/events/reports/DeleteReportButton'

const TYPE_LABEL: Record<string, string> = {
  technical: 'Relatório Técnico',
  contract: 'Execução de Contrato',
}

const TYPE_COLOR: Record<string, string> = {
  technical: 'bg-blue-50 text-blue-700 border-blue-200',
  contract: 'bg-amber-50 text-amber-700 border-amber-200',
}

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()

  const [{ data: event }, { data: reports }] = await Promise.all([
    supabase.from('events').select('id, name').eq('id', eventId).single(),
    supabase
      .from('event_reports')
      .select('id, title, type, file_name, file_size, mime_type, blob_url, created_at')
      .eq('event_id', eventId)
      .order('type', { ascending: true })
      .order('created_at', { ascending: false }),
  ])

  if (!event) notFound()

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/events/${eventId}`}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> {event.name}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
            <p className="text-slate-500 mt-1">{reports?.length ?? 0} relatório(s)</p>
          </div>
          <AddReportDialog eventId={eventId} />
        </div>
      </div>

      {!reports?.length ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <FileText className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400 text-sm">Ainda não há relatórios. Adiciona o primeiro.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
          {reports.map((r) => (
            <div key={r.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-slate-800 text-sm font-medium truncate">{r.title}</p>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLOR[r.type] ?? ''}`}>
                    {TYPE_LABEL[r.type] ?? r.type}
                  </span>
                </div>
                <p className="text-slate-400 text-xs">
                  {r.file_name} ·{' '}
                  {format(new Date(r.created_at), "d MMM yyyy · HH'h'mm", { locale: pt })}
                </p>
              </div>
              <a
                href={r.blob_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-500 border border-slate-200 px-3 py-1.5 rounded-md hover:border-slate-400 hover:text-slate-700 transition-colors shrink-0"
              >
                Ver
              </a>
              <DeleteReportButton eventId={eventId} reportId={r.id} blobUrl={r.blob_url} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
