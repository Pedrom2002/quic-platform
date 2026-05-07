'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { loadAllFilesAction, type FileWithEvent } from '@/app/dashboard/files/actions'
import { FileText, ImageIcon, FileSpreadsheet, File, Download, FolderOpen, Search } from 'lucide-react'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File className="w-4 h-4 text-slate-400" />
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-blue-400" />
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv')
    return <FileSpreadsheet className="w-4 h-4 text-green-500" />
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.startsWith('text/'))
    return <FileText className="w-4 h-4 text-red-400" />
  return <File className="w-4 h-4 text-slate-400" />
}

export default function GlobalFilesPage() {
  const [allFiles, setAllFiles] = useState<FileWithEvent[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllFilesAction().then(data => {
      setAllFiles(data)
      setLoading(false)
    })
  }, [])

  const filtered = allFiles.filter(f => {
    if (!search) return true
    const q = search.toLowerCase()
    return f.file_name.toLowerCase().includes(q) || f.event?.name.toLowerCase().includes(q)
  })

  // Group by event_id
  const groups = new Map<string, { eventName: string; eventId: string; files: FileWithEvent[] }>()
  for (const f of filtered) {
    const eid = f.event_id
    if (!groups.has(eid)) {
      groups.set(eid, { eventName: f.event?.name ?? 'Evento desconhecido', eventId: eid, files: [] })
    }
    groups.get(eid)!.files.push(f)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ficheiros</h1>
          <p className="text-slate-500 mt-1">{allFiles.length} ficheiros</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300 w-56"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">A carregar...</div>
      ) : groups.size === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">{search ? 'Sem resultados.' : 'Nenhum ficheiro ainda.'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {[...groups.values()].map(group => (
            <div key={group.eventId}>
              <div className="flex items-center gap-2 mb-2">
                <Link
                  href={`/dashboard/events/${group.eventId}/files`}
                  className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                >
                  {group.eventName}
                </Link>
                <span className="text-xs text-slate-400">{group.files.length} ficheiro{group.files.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
                {group.files.map(file => (
                  <div key={file.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="shrink-0">{getFileIcon(file.mime_type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{file.file_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {file.file_size ? formatBytes(file.file_size) : ''}
                        {file.file_size ? ' · ' : ''}
                        {format(new Date(file.created_at), "d MMM yyyy", { locale: pt })}
                        {file.uploader && ` · ${file.uploader.full_name}`}
                      </p>
                    </div>
                    <a
                      href={file.blob_url}
                      download={file.file_name}
                      className="shrink-0 p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
                      aria-label="Descarregar"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
