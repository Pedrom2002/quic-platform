'use client'

import { useState, useTransition, useRef } from 'react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import {
  uploadFileToItemAction,
  unlinkFileFromItemAction,
  linkFileToItemAction,
  loadEventFilesForLinkingAction,
} from '@/app/dashboard/events/[eventId]/checklist/actions'
import type { ChecklistItemFileLink, EventFileWithUploader } from '@/types/app'
import { Upload, Trash2, Download, FileText, ImageIcon, FileSpreadsheet, File, Loader2, Link2, X, Search } from 'lucide-react'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File className="w-3.5 h-3.5 text-slate-400" />
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv')
    return <FileSpreadsheet className="w-3.5 h-3.5 text-green-500" />
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.startsWith('text/'))
    return <FileText className="w-3.5 h-3.5 text-red-400" />
  return <File className="w-3.5 h-3.5 text-slate-400" />
}

interface ItemFilesSectionProps {
  eventId: string
  itemId: string
  initialFiles: ChecklistItemFileLink[]
}

export default function ItemFilesSection({ eventId, itemId, initialFiles }: ItemFilesSectionProps) {
  const [files, setFiles] = useState<ChecklistItemFileLink[]>(initialFiles)
  const [uploading, setUploading] = useState(false)
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerFiles, setPickerFiles] = useState<EventFileWithUploader[]>([])
  const [pickerSearch, setPickerSearch] = useState('')
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(fileList: FileList) {
    setUploading(true)
    for (const file of Array.from(fileList)) {
      const fd = new FormData()
      fd.append('file', file)
      const linked = await uploadFileToItemAction(eventId, itemId, fd)
      if (linked) setFiles(prev => [linked, ...prev])
    }
    setUploading(false)
  }

  function handleUnlink(linkId: string) {
    setUnlinkingId(linkId)
    setFiles(prev => prev.filter(f => f.id !== linkId))
    startTransition(async () => {
      await unlinkFileFromItemAction(eventId, itemId, linkId)
      setUnlinkingId(null)
    })
  }

  async function openPicker() {
    const linkedFileIds = new Set(files.map(f => f.event_file_id))
    const all = await loadEventFilesForLinkingAction(eventId)
    setPickerFiles(all.filter(f => !linkedFileIds.has(f.id)))
    setPickerSearch('')
    setShowPicker(true)
  }

  async function handleLink(eventFile: EventFileWithUploader) {
    const linked = await linkFileToItemAction(eventId, itemId, eventFile.id)
    if (linked) {
      setFiles(prev => [linked, ...prev])
      setPickerFiles(prev => prev.filter(f => f.id !== eventFile.id))
    }
    if (pickerFiles.length <= 1) setShowPicker(false)
  }

  const filteredPicker = pickerFiles.filter(f =>
    !pickerSearch || f.file_name.toLowerCase().includes(pickerSearch.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Upload className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Ficheiros</span>
        <span className="text-xs text-slate-400">{files.length}</span>
        <button
          onClick={openPicker}
          className="ml-auto text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
        >
          <Link2 className="w-3 h-3" /> Ligar existente
        </button>
      </div>

      {/* Upload zone */}
      <label
        className="flex items-center justify-center w-full h-16 border border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 transition-colors bg-white mb-3"
      >
        <input ref={inputRef} type="file" multiple className="hidden"
          onChange={e => e.target.files && handleUpload(e.target.files)} />
        {uploading
          ? <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">A carregar...</span></div>
          : <span className="text-xs text-slate-400">Clique ou arraste para carregar</span>
        }
      </label>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map(link => (
            <div key={link.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 group">
              <div className="shrink-0">{getFileIcon(link.file.mime_type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">{link.file.file_name}</p>
                <p className="text-[10px] text-slate-400">
                  {link.file.file_size ? formatBytes(link.file.file_size) : ''}
                  {link.file.file_size ? ' · ' : ''}
                  {format(new Date(link.file.created_at), "d MMM", { locale: pt })}
                </p>
              </div>
              <a href={link.file.blob_url} download={link.file.file_name}
                className="shrink-0 text-slate-300 hover:text-slate-600 transition-colors" aria-label="Descarregar">
                <Download className="w-3.5 h-3.5" />
              </a>
              <button onClick={() => handleUnlink(link.id)} disabled={unlinkingId === link.id}
                className="shrink-0 text-slate-300 hover:text-red-400 transition-colors disabled:opacity-40" aria-label="Remover ligação">
                {unlinkingId === link.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Picker modal */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPicker(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[60vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-800">Ligar ficheiro existente</span>
              <button onClick={() => setShowPicker(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-2 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Pesquisar..." value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300" />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {!filteredPicker.length
                ? <p className="text-sm text-slate-400 text-center py-8">{pickerSearch ? 'Sem resultados.' : 'Todos os ficheiros ja estao ligados.'}</p>
                : filteredPicker.map(f => (
                  <button key={f.id} onClick={() => handleLink(f)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors">
                    {getFileIcon(f.mime_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{f.file_name}</p>
                      <p className="text-xs text-slate-400">{f.file_size ? formatBytes(f.file_size) : ''}</p>
                    </div>
                  </button>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
