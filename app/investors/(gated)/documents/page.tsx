import { createClient } from '@/lib/supabase/server'

const dateFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })

const TYPE_LABELS: Record<string, string> = {
  contract: 'Contrato',
  report: 'Relatório',
  tax: 'Fiscal',
  presentation: 'Apresentação',
}

const TYPE_CLASSES: Record<string, string> = {
  contract: 'bg-sky-50 text-sky-700 border-sky-200',
  report: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  tax: 'bg-amber-50 text-amber-700 border-amber-200',
  presentation: 'bg-violet-50 text-violet-700 border-violet-200',
}

function documentTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type
}

function documentTypeClasses(type: string): string {
  return TYPE_CLASSES[type] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'
}

export default async function InvestorDocumentsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('investor_documents')
    .select('id, title, type, file_url, uploaded_at')
    .order('uploaded_at', { ascending: false })

  const documents = data ?? []

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Documents</h1>
      {documents.length === 0 ? (
        <p className="text-zinc-500">Ainda não tens documentos disponíveis.</p>
      ) : (
        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Título</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 font-medium">Data</th>
                <th className="text-left px-4 py-3 font-medium">Download</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id} className="border-t border-zinc-200">
                  <td className="px-4 py-3 text-zinc-900">{doc.title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${documentTypeClasses(doc.type)}`}>
                      {documentTypeLabel(doc.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {dateFormatter.format(new Date(doc.uploaded_at))}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--quic-magenta)] hover:underline"
                    >
                      Descarregar
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
