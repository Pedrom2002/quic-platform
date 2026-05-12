'use client'

import { useState, useTransition, useRef } from 'react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { put } from '@vercel/blob/client'
import { deleteFileAction } from '@/app/dashboard/events/[eventId]/files/actions'
import type { EventFileWithUploader } from '@/types/app'
import { Upload, Trash2, Download, Eye, X, FileText, ImageIcon, FileSpreadsheet, File, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50 MB
const DIRECT_UPLOAD_THRESHOLD = 4 * 1024 * 1024 // 4 MB — above this, upload directly to Vercel Blob

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

function isPreviewable(mimeType: string | null): boolean {
  if (!mimeType) return false
  return mimeType.startsWith('image/') || mimeType.startsWith('video/')
}

interface PreviewFile { url: string; name: string; mimeType: string }

function PreviewModal({ file, onClose }: { file: PreviewFile; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
        onClick={onClose}
        aria-label="Fechar"
      >
        <X className="w-6 h-6" />
      </button>
      <div
        className="max-w-4xl max-h-[90vh] w-full flex flex-col items-center gap-3"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-white/80 text-sm font-medium truncate max-w-full px-8">{file.name}</p>
        {file.mimeType.startsWith('image/') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.url}
            alt={file.name}
            className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
          />
        ) : (
          <video
            src={file.url}
            controls
            autoPlay
            className="max-h-[80vh] max-w-full rounded-lg shadow-2xl"
          />
        )}
      </div>
    </div>
  )
}

export default function FilesManager({ eventId, initialFiles }: FilesManagerProps) {
  const [files, setFiles] = useState<EventFileWithUploader[]>(initialFiles)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null)
  const [, startTransition] = useTransition()
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(fileList: FileList) {
    setUploading(true)
    try {
      for (const file of Array.from(fileList)) {
        if (file.size > MAX_FILE_BYTES) {
          toast.error(`"${file.name}" excede o limite máximo de 50 MB`)
          continue
        }

        const uploaded = file.size > DIRECT_UPLOAD_THRESHOLD
          ? await uploadDirect(file)
          : await uploadViaServer(file)

        if (uploaded) setFiles(prev => [uploaded, ...prev])
      }
    } catch {
      toast.error('Erro ao carregar ficheiro')
    } finally {
      setUploading(false)
    }
  }

  async function uploadViaServer(file: File): Promise<EventFileWithUploader | null> {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/events/${eventId}/files`, { method: 'POST', body: fd })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error((json as { error?: string }).error ?? 'Erro ao carregar ficheiro')
      return null
    }
    const json = await res.json() as { file: EventFileWithUploader }
    return json.file
  }

  async function uploadDirect(file: File): Promise<EventFileWithUploader | null> {
    // Step 1: get a short-lived client token from the server
    const tokenRes = await fetch(
      `/api/events/${eventId}/files/token?filename=${encodeURIComponent(file.name)}&mimeType=${encodeURIComponent(file.type)}`
    )
    if (!tokenRes.ok) {
      const json = await tokenRes.json().catch(() => ({}))
      toast.error((json as { error?: string }).error ?? 'Erro ao iniciar upload')
      return null
    }
    const { token, pathname } = await tokenRes.json() as { token: string; pathname: string }

    // Step 2: upload directly from browser to Vercel Blob (bypasses server body limit)
    const blob = await put(pathname, file, { access: 'public', token, multipart: true })

    // Step 3: save metadata to database via server
    const saveRes = await fetch(`/api/events/${eventId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      }),
    })
    if (!saveRes.ok) {
      const json = await saveRes.json().catch(() => ({}))
      toast.error((json as { error?: string }).error ?? 'Erro ao guardar ficheiro')
      return null
    }
    const saveJson = await saveRes.json() as { file: EventFileWithUploader }
    return saveJson.file
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
      try {
        const ok = await deleteFileAction(eventId, fileId)
        if (ok) setFiles(prev => prev.filter(f => f.id !== fileId))
      } catch {
        // erro silencioso — o toast de erro não é crítico aqui
      } finally {
        setDeletingId(null)
      }
    })
  }

  return (
    <>
    {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
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
            <p className="text-xs text-slate-300 mt-1">Máximo 50 MB por ficheiro · imagens, PDF, Word, Excel, vídeo (MP4, MOV)</p>
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
                {isPreviewable(file.mime_type) && (
                  <button
                    type="button"
                    onClick={() => setPreviewFile({ url: file.blob_url, name: file.file_name, mimeType: file.mime_type! })}
                    className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
                    aria-label="Pré-visualizar"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
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
    </>
  )
}
