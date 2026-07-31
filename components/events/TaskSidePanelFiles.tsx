'use client'

import { useState, useTransition, useRef } from 'react'
import { X, Upload, Download, Loader2, Link2, Search, File, FileText, ImageIcon, FileSpreadsheet, Trash2 } from 'lucide-react'
import {
  uploadFileToTaskAction,
  linkFileToTaskAction,
  unlinkFileFromTaskAction,
} from '@/app/dashboard/events/[eventId]/tasks/actions'
import type { EventTaskFileLink, EventFileWithUploader } from '@/types/app'

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

interface TaskSidePanelFilesProps {
  eventId: string
  taskId: string
  fileLinks: EventTaskFileLink[] | null
  setFileLinks: (updater: EventTaskFileLink[] | null | ((prev: EventTaskFileLink[] | null) => EventTaskFileLink[] | null)) => void
}

export default function TaskSidePanelFiles({ eventId, taskId, fileLinks, setFileLinks }: TaskSidePanelFilesProps) {
  const [uploading, setUploading] = useState(false)
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)
  const [showFilePicker, setShowFilePicker] = useState(false)
  const [pickerFiles, setPickerFiles] = useState<EventFileWithUploader[]>([])
  const [pickerSearch, setPickerSearch] = useState('')
  const [, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileUpload(fileList: FileList) {
    setUploading(true)
    for (const file of Array.from(fileList)) {
      const fd = new FormData()
      fd.append('file', file)
      const linked = await uploadFileToTaskAction(eventId, taskId, fd)
      if (linked) setFileLinks(prev => prev ? [linked, ...prev] : [linked])
    }
    setUploading(false)
  }

  function handleUnlink(linkId: string) {
    setUnlinkingId(linkId)
    setFileLinks(prev => prev ? prev.filter(f => f.id !== linkId) : null)
    startTransition(async () => {
      await unlinkFileFromTaskAction(eventId, taskId, linkId)
      setUnlinkingId(null)
    })
  }

  async function openFilePicker() {
    const linkedIds = new Set((fileLinks ?? []).map(f => f.event_file_id))
    const { loadEventFilesForLinkingAction } = await import('@/app/dashboard/events/[eventId]/checklist/actions-files')
    const eventFiles = await loadEventFilesForLinkingAction(eventId)
    setPickerFiles(eventFiles.filter(f => !linkedIds.has(f.id)))
    setPickerSearch('')
    setShowFilePicker(true)
  }

  async function handleLinkFile(eventFile: EventFileWithUploader) {
    const linked = await linkFileToTaskAction(eventId, taskId, eventFile.id)
    if (linked) {
      setFileLinks(prev => prev ? [linked, ...prev] : [linked])
      setPickerFiles(prev => prev.filter(f => f.id !== eventFile.id))
    }
    if (pickerFiles.length <= 1) setShowFilePicker(false)
  }

  const filteredPicker = pickerFiles.filter(f =>
    !pickerSearch || f.file_name.toLowerCase().includes(pickerSearch.toLowerCase())
  )

  return (
    <>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Ficheiros</span>
          <span className="text-xs text-slate-400">{fileLinks?.length ?? 0}</span>
          <button onClick={openFilePicker} className="ml-auto text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors">
            <Link2 className="w-3 h-3" /> Ligar existente
          </button>
        </div>
        <label className="flex items-center justify-center w-full h-12 border border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 transition-colors bg-white mb-3">
          <input ref={fileInputRef} type="file" multiple className="hidden"
            onChange={e => e.target.files && handleFileUpload(e.target.files)} />
          {uploading
            ? <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">A carregar...</span></div>
            : <span className="text-xs text-slate-400">Clique para carregar</span>
          }
        </label>
        {fileLinks === null ? (
          <p className="text-xs text-slate-400">A carregar...</p>
        ) : fileLinks.length > 0 && (
          <div className="space-y-1">
            {fileLinks.map(link => (
              <div key={link.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50">
                {getFileIcon(link.file.mime_type)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{link.file.file_name}</p>
                  <p className="text-[10px] text-slate-400">{link.file.file_size ? formatBytes(link.file.file_size) : ''}</p>
                </div>
                <a href={link.file.blob_url} download={link.file.file_name}
                  aria-label={`Descarregar ${link.file.file_name}`}
                  className="shrink-0 text-slate-300 hover:text-slate-600 transition-colors">
                  <Download className="w-3.5 h-3.5" />
                </a>
                <button onClick={() => handleUnlink(link.id)} disabled={unlinkingId === link.id}
                  aria-label={`Desligar ${link.file.file_name}`}
                  className="shrink-0 text-slate-300 hover:text-red-400 transition-colors disabled:opacity-40">
                  {unlinkingId === link.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File picker modal */}
      {showFilePicker && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={() => setShowFilePicker(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[60vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-800">Ligar ficheiro existente</span>
              <button onClick={() => setShowFilePicker(false)} aria-label="Fechar" className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-4 py-2 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Pesquisar..." value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300" />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {!filteredPicker.length
                ? <p className="text-sm text-slate-400 text-center py-8">{pickerSearch ? 'Sem resultados.' : 'Todos os ficheiros já estão ligados.'}</p>
                : filteredPicker.map(f => (
                  <button key={f.id} onClick={() => handleLinkFile(f)}
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
    </>
  )
}
