'use client'

import { useState, useTransition, useRef } from 'react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { uploadFileAction, deleteFileAction } from '@/app/dashboard/events/[eventId]/files/actions'
import type { EventFileWithUploader } from '@/types/app'
import { Upload, Trash2, Download, FileText, ImageIcon, FileSpreadsheet, File, Loader2 } from 'lucide-react'

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

interface FilesManagerProps {
  eventId: string
  initialFiles: EventFileWithUploader[]
}

export default function FilesManager({ eventId, initialFiles }: FilesManagerProps) {
  const [files, setFiles] = useState<EventFileWithUploader[]>(initialFiles)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(fileList: FileList) {
    setUploading(true)
    for (const file of Array.from(fileList)) {
      const fd = new FormData()
      fd.append('file', file)
      const uploaded = await uploadFileAction(eventId, fd)
      if (uploaded) setFiles(prev => [uploaded, ...prev])
    }
    setUploading(false)
  }

  async function handleDownload(url: string, filename: string) {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      // fallback: abrir em nova tab
      window.open(url, '_blank')
    }
  }

  function handleDelete(fileId: string) {
    setDeletingId(fileId)
    startTransition(async () => {
      const ok = await deleteFileAction(eventId, fileId)
      if (ok) setFiles(prev => prev.filter(f => f.id !== fileId))
      setDeletingId(null)
    })
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <label
        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          isDragOver ? 'border-slate-400 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'
        }`}
        onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setIsDragOver(false)
          if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">A carregar...</span>
          </div>
        ) : (
          <>
            <Upload className="w-6 h-6 text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">Arrastar ficheiros ou <span className="text-slate-600 font-medium">clique para selecionar</span></p>
            <p className="text-xs text-slate-300 mt-1">Max. 50 MB por ficheiro</p>
          </>
        )}
      </label>

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
          {files.map(file => (
            <div key={file.id} className="flex items-center gap-3 px-4 py-3">
              <div className="shrink-0">{getFileIcon(file.mime_type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{file.file_name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {file.file_size ? formatBytes(file.file_size) : '-'}
                  {' · '}
                  {format(new Date(file.created_at), "d MMM yyyy", { locale: pt })}
                  {file.uploader && ` · ${file.uploader.full_name}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(file.blob_url, file.file_name)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
                  aria-label="Descarregar"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(file.id)}
                  disabled={deletingId === file.id}
                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40"
                  aria-label="Apagar ficheiro"
                >
                  {deletingId === file.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && !uploading && (
        <p className="text-center text-sm text-slate-400 py-4">Nenhum ficheiro anexado.</p>
      )}
    </div>
  )
}
