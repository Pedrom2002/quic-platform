import { createClient } from '@/lib/supabase/server'

const dateFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })

const TYPE_LABELS: Record<string, string> = {
  contract: 'Contrato',
  report: 'Relatório',
  tax: 'Fiscal',
  presentation: 'Apresentação',
}

const TYPE_CLASSES: Record<string, string> = {
  contract: 'bg-sky-950/40 text-sky-400 border-sky-900',
  report: 'bg-emerald-950/40 text-emerald-400 border-emerald-900',
  tax: 'bg-amber-950/40 text-amber-400 border-amber-900',
  presentation: 'bg-violet-950/40 text-violet-400 border-violet-900',
}

function documentTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type
}

function documentTypeClasses(type: string): string {
  return TYPE_CLASSES[type] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'
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
      <h1 className="text-2xl font-semibold text-white mb-6">Documents</h1>
      {documents.length === 0 ? (
        <p className="text-zinc-400">Ainda não tens documentos disponíveis.</p>
      ) : (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Título</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 font-medium">Data</th>
                <th className="text-left px-4 py-3 font-medium">Download</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id} className="border-t border-zinc-800">
                  <td className="px-4 py-3 text-white">{doc.title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${documentTypeClasses(doc.type)}`}>
                      {documentTypeLabel(doc.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
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
