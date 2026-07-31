'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { format, differenceInCalendarDays, isToday } from 'date-fns'
import { pt } from 'date-fns/locale'
import { X, Plus, Trash2, FileText, Upload, Download, Loader2, Link2, Search, File, ImageIcon, FileSpreadsheet } from 'lucide-react'
import {
  updateTaskAction,
  loadTaskNotesAction,
  loadTaskFilesAction,
  addTaskNoteAction,
  deleteTaskNoteAction,
  uploadFileToTaskAction,
  linkFileToTaskAction,
  unlinkFileFromTaskAction,
  loadChecklistItemsForLinkingAction,
  createTaskAction,
} from '@/app/dashboard/events/[eventId]/tasks/actions'
import type { EventTask, EventTaskNote, EventTaskFileLink, ChecklistItemStatus, EventFileWithUploader } from '@/types/app'
import { calcProgress, buildTree } from './TaskTree'

const STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  pending: 'A fazer',
  in_progress: 'Em progresso',
  completed: 'Concluído',
  skipped: 'Ignorado',
}

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

interface OrgMember { id: string; full_name: string }

interface TaskSidePanelProps {
  eventId: string
  task: EventTask
  allTasks: EventTask[]
  orgMembers: OrgMember[]
  currentMemberId: string | null
  checklistItems: { id: string; title: string; client_label: string | null; status: string }[]
  onClose: () => void
  onUpdate: (updated: Partial<EventTask> & { id: string }) => void
  onCreated: (task: EventTask) => void
}

function OverdueIndicator({ dueAt, status }: { dueAt: string | null; status: ChecklistItemStatus }) {
  if (!dueAt || status === 'completed' || status === 'skipped') return null
  const due = new Date(dueAt)
  if (isToday(due)) return <span className="ml-2 text-xs font-medium text-orange-500">Hoje</span>
  const days = differenceInCalendarDays(due, new Date())
  if (days < 0) return <span className="ml-2 text-xs font-medium text-red-500">{Math.abs(days)}d em atraso</span>
  if (days <= 3) return <span className="ml-2 text-xs font-medium text-amber-500">{days}d</span>
  return null
}

export default function TaskSidePanel({
  eventId, task, allTasks, orgMembers, currentMemberId, checklistItems,
  onClose, onUpdate, onCreated,
}: TaskSidePanelProps) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [status, setStatus] = useState<ChecklistItemStatus>(task.status)
  const [assignedTo, setAssignedTo] = useState(task.assigned_to ?? '')
  const [dueAt, setDueAt] = useState(task.due_at ? format(new Date(task.due_at), "yyyy-MM-dd'T'HH:mm") : '')
  const [checklistItemId, setChecklistItemId] = useState(task.checklist_item_id ?? '')

  const [notes, setNotes] = useState<EventTaskNote[] | null>(null)
  const [fileLinks, setFileLinks] = useState<EventTaskFileLink[] | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [uploading, setUploading] = useState(false)
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)
  const [showFilePicker, setShowFilePicker] = useState(false)
  const [pickerFiles, setPickerFiles] = useState<EventFileWithUploader[]>([])
  const [pickerSearch, setPickerSearch] = useState('')
  const [addingSubTask, setAddingSubTask] = useState(false)
  const [subTaskTitle, setSubTaskTitle] = useState('')
  const [, startTransition] = useTransition()

  const [suggestionState, setSuggestionState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'suggested'; memberId: string; memberName: string; reason: string }
  >({ status: 'idle' })

  const [describeState, setDescribeState] = useState<
    | { status: 'idle' }
    | { status: 'streaming' }
    | { status: 'done'; subtasks: string[] }
  >({ status: 'idle' })
  const [selectedSubtasks, setSelectedSubtasks] = useState<Set<number>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadTaskNotesAction(eventId, task.id).then(setNotes)
    loadTaskFilesAction(eventId, task.id).then(setFileLinks)
  }, [eventId, task.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description ?? '')
    setStatus(task.status)
    setAssignedTo(task.assigned_to ?? '')
    setDueAt(task.due_at ? format(new Date(task.due_at), "yyyy-MM-dd'T'HH:mm") : '')
    setChecklistItemId(task.checklist_item_id ?? '')
    setNotes(null)
    setFileLinks(null)
    loadTaskNotesAction(eventId, task.id).then(setNotes)
    loadTaskFilesAction(eventId, task.id).then(setFileLinks)
    setSuggestionState({ status: 'idle' })
    setDescribeState({ status: 'idle' })
    setSelectedSubtasks(new Set())
  }, [task.id, eventId, task.title, task.description, task.status, task.assigned_to, task.due_at, task.checklist_item_id])

  function saveField(fields: Parameters<typeof updateTaskAction>[2]) {
    startTransition(async () => {
      const updated = await updateTaskAction(eventId, task.id, fields)
      if (updated) onUpdate({ id: task.id, ...fields })
    })
  }

  const tree = buildTree(allTasks)
  function findNode(nodes: ReturnType<typeof buildTree>, id: string): ReturnType<typeof buildTree>[0] | null {
    for (const n of nodes) {
      if (n.id === id) return n
      const found = findNode(n.children, id)
      if (found) return found
    }
    return null
  }
  const taskNode = findNode(tree, task.id)
  const progress = taskNode && taskNode.children.length > 0 ? calcProgress(taskNode) : null

  const directChildren = allTasks.filter(t => t.parent_id === task.id).sort((a, b) => a.position - b.position)

  function handleAddSubTask() {
    const trimmed = subTaskTitle.trim()
    if (!trimmed) return
    setSubTaskTitle('')
    setAddingSubTask(false)
    startTransition(async () => {
      const created = await createTaskAction(eventId, { title: trimmed, parentId: task.id })
      if (created) onCreated(created)
    })
  }

  function handleAddNote() {
    const trimmed = noteContent.trim()
    if (!trimmed) return
    const optimisticId = `optimistic-${Date.now()}`
    const optimistic: EventTaskNote = {
      id: optimisticId, task_id: task.id, event_id: eventId, organization_id: '',
      author_id: currentMemberId, content: trimmed,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(), author: null,
    }
    setNotes(prev => prev ? [optimistic, ...prev] : [optimistic])
    setNoteContent('')
    startTransition(async () => {
      const note = await addTaskNoteAction(eventId, task.id, trimmed)
      setNotes(prev => prev
        ? note ? prev.map(n => n.id === optimisticId ? note : n) : prev.filter(n => n.id !== optimisticId)
        : null
      )
    })
  }

  function handleDeleteNote(noteId: string) {
    setDeletingNoteId(noteId)
    setNotes(prev => prev ? prev.filter(n => n.id !== noteId) : null)
    startTransition(async () => {
      await deleteTaskNoteAction(eventId, task.id, noteId)
      setDeletingNoteId(null)
    })
  }

  async function handleFileUpload(fileList: FileList) {
    setUploading(true)
    for (const file of Array.from(fileList)) {
      const fd = new FormData()
      fd.append('file', file)
      const linked = await uploadFileToTaskAction(eventId, task.id, fd)
      if (linked) setFileLinks(prev => prev ? [linked, ...prev] : [linked])
    }
    setUploading(false)
  }

  function handleUnlink(linkId: string) {
    setUnlinkingId(linkId)
    setFileLinks(prev => prev ? prev.filter(f => f.id !== linkId) : null)
    startTransition(async () => {
      await unlinkFileFromTaskAction(eventId, task.id, linkId)
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
    const linked = await linkFileToTaskAction(eventId, task.id, eventFile.id)
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
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== task.title && saveField({ title: title.trim() })}
            className="flex-1 text-base font-semibold text-slate-900 focus:outline-none bg-transparent"
            placeholder="Título da tarefa"
          />
          <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Status + Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide block mb-1">Estado</label>
              <select value={status} onChange={e => { const s = e.target.value as ChecklistItemStatus; setStatus(s); saveField({ status: s }) }}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white">
                {(Object.keys(STATUS_LABELS) as ChecklistItemStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide block mb-1">Responsável</label>
              <select value={assignedTo} onChange={e => { setAssignedTo(e.target.value); saveField({ assigned_to: e.target.value || null }) }}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white">
                <option value="">Sem atribuição</option>
                {orgMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
              {assignedTo === '' && orgMembers.length > 1 && (
                <div className="mt-1.5">
                  {suggestionState.status === 'idle' && (
                    <button
                      onClick={async () => {
                        setSuggestionState({ status: 'loading' })
                        try {
                          const res = await fetch('/api/ai/suggest-assignee', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ taskId: task.id, eventId }),
                          })
                          const data = await res.json() as { memberId: string; memberName: string; reason: string } | null
                          if (data) {
                            setSuggestionState({ status: 'suggested', ...data })
                          } else {
                            setSuggestionState({ status: 'idle' })
                          }
                        } catch {
                          setSuggestionState({ status: 'idle' })
                        }
                      }}
                      className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                      ✨ Sugerir responsável
                    </button>
                  )}
                  {suggestionState.status === 'loading' && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> A sugerir...
                    </span>
                  )}
                  {suggestionState.status === 'suggested' && (
                    <div className="text-xs">
                      <span className="text-slate-600 font-medium">{suggestionState.memberName}</span>
                      <span className="text-slate-400"> — {suggestionState.reason}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => {
                            setAssignedTo(suggestionState.memberId)
                            saveField({ assigned_to: suggestionState.memberId })
                            setSuggestionState({ status: 'idle' })
                          }}
                          className="text-xs font-medium text-green-600 hover:text-green-700"
                        >
                          Aceitar
                        </button>
                        <button
                          onClick={() => setSuggestionState({ status: 'idle' })}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          Dispensar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide block mb-1">
              Data limite {dueAt && <OverdueIndicator dueAt={new Date(dueAt).toISOString()} status={status} />}
            </label>
            <input type="datetime-local" value={dueAt}
              onChange={e => { setDueAt(e.target.value); saveField({ due_at: e.target.value ? new Date(e.target.value).toISOString() : null }) }}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-300" />
          </div>

          {/* Checklist link */}
          <div>
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide block mb-1">Ligar a checklist (opcional)</label>
            <select value={checklistItemId}
              onChange={e => { setChecklistItemId(e.target.value); saveField({ checklist_item_id: e.target.value || null }) }}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white">
              <option value="">Sem ligação</option>
              {checklistItems.map(ci => (
                <option key={ci.id} value={ci.id}>{ci.client_label ?? ci.title}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide block mb-1">Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              onBlur={() => saveField({ description: description || null })}
              rows={3} placeholder="Adicionar descrição..."
              className="w-full text-sm text-slate-700 placeholder-slate-300 border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-slate-300" />
            <div className="mt-1.5">
              <button
                onClick={async () => {
                  setDescribeState({ status: 'streaming' })
                  setDescription('')
                  try {
                    const res = await fetch('/api/ai/describe-task', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ taskId: task.id, eventId }),
                    })
                    if (!res.ok || !res.body) {
                      setDescribeState({ status: 'idle' })
                      return
                    }
                    const reader = res.body.getReader()
                    const decoder = new TextDecoder()
                    let accumulated = ''
                    const SENTINEL = '---SUBTASKS---'

                    while (true) {
                      const { done, value } = await reader.read()
                      if (done) break
                      accumulated += decoder.decode(value, { stream: true })

                      const sentinelIdx = accumulated.indexOf(SENTINEL)
                      if (sentinelIdx === -1) {
                        setDescription(accumulated)
                      } else {
                        setDescription(accumulated.slice(0, sentinelIdx).trimEnd())
                      }
                    }

                    const sentinelIdx = accumulated.indexOf(SENTINEL)
                    if (sentinelIdx !== -1) {
                      const descPart = accumulated.slice(0, sentinelIdx).trimEnd()
                      const subtasksPart = accumulated.slice(sentinelIdx + SENTINEL.length).trim()
                      saveField({ description: descPart })
                      try {
                        const subtasks = JSON.parse(subtasksPart) as string[]
                        setSelectedSubtasks(new Set(subtasks.map((_, i) => i)))
                        setDescribeState({ status: 'done', subtasks })
                      } catch {
                        setDescribeState({ status: 'done', subtasks: [] })
                      }
                    } else {
                      saveField({ description: accumulated })
                      setDescribeState({ status: 'idle' })
                    }
                  } catch {
                    setDescribeState({ status: 'idle' })
                  }
                }}
                disabled={describeState.status === 'streaming'}
                className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {describeState.status === 'streaming'
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> A gerar...</>
                  : <>✨ {description ? 'Regenerar descrição' : 'Gerar descrição'}</>
                }
              </button>
            </div>

            {describeState.status === 'done' && describeState.subtasks.length > 0 && (
              <div className="mt-3 border border-indigo-100 rounded-lg p-3 bg-indigo-50/50">
                <p className="text-xs font-medium text-indigo-700 mb-2">Sub-tarefas sugeridas</p>
                <div className="space-y-1.5">
                  {describeState.subtasks.map((sub, i) => (
                    <label key={i} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSubtasks.has(i)}
                        onChange={() => {
                          setSelectedSubtasks(prev => {
                            const next = new Set(prev)
                            next.has(i) ? next.delete(i) : next.add(i)
                            return next
                          })
                        }}
                        className="w-3.5 h-3.5 rounded text-indigo-600"
                      />
                      <span className="text-xs text-slate-700">{sub}</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={async () => {
                    if (describeState.status !== 'done') return
                    const toCreate = describeState.subtasks.filter((_, i) => selectedSubtasks.has(i))
                    for (const title of toCreate) {
                      const created = await createTaskAction(eventId, { title, parentId: task.id })
                      if (created) onCreated(created)
                    }
                    setDescribeState({ status: 'idle' })
                  }}
                  disabled={selectedSubtasks.size === 0}
                  className="mt-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  Criar sub-tarefas selecionadas
                </button>
              </div>
            )}
          </div>

          {/* Progress */}
          {progress && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Progresso</span>
                <span className="text-xs text-slate-500">{progress.completed}/{progress.total}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0}%` }} />
              </div>
            </div>
          )}

          {/* Direct sub-tasks */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Sub-tarefas diretas</span>
              <span className="text-xs text-slate-400">{directChildren.length}</span>
              <button onClick={() => setAddingSubTask(true)} className="ml-auto text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors">
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>
            {addingSubTask && (
              <div className="flex items-center gap-2 mb-2 border border-slate-200 rounded-lg px-3 py-1.5">
                <input autoFocus type="text" value={subTaskTitle} onChange={e => setSubTaskTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddSubTask(); if (e.key === 'Escape') { setAddingSubTask(false); setSubTaskTitle('') } }}
                  placeholder="Título..." className="flex-1 text-sm focus:outline-none" />
                <button onClick={handleAddSubTask} className="text-xs font-medium px-2 py-0.5 bg-slate-900 text-white rounded">OK</button>
                <button onClick={() => { setAddingSubTask(false); setSubTaskTitle('') }} className="text-xs text-slate-400 hover:text-slate-700">✕</button>
              </div>
            )}
            {directChildren.length > 0 && (
              <div className="space-y-1">
                {directChildren.map(child => (
                  <div key={child.id} className="flex items-center gap-2 text-sm text-slate-600 py-1 px-2 rounded hover:bg-slate-50">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${child.status === 'completed' ? 'bg-green-400' : child.status === 'in_progress' ? 'bg-blue-400' : 'bg-amber-300'}`} />
                    <span className={child.status === 'completed' ? 'line-through text-slate-400' : ''}>{child.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100" />

          {/* Notes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Notas</span>
              <span className="text-xs text-slate-400">{notes?.length ?? 0}</span>
            </div>
            <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)}
              placeholder="Adicionar nota..." rows={2}
              className="w-full text-sm text-slate-700 placeholder-slate-300 border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-slate-300 mb-1.5"
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote() }} />
            <div className="flex justify-end mb-3">
              <button onClick={handleAddNote} disabled={!noteContent.trim()}
                className="text-xs font-medium px-3 py-1.5 bg-slate-900 text-white rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors">
                Guardar
              </button>
            </div>
            {notes === null ? (
              <p className="text-xs text-slate-400">A carregar...</p>
            ) : notes.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">Sem notas ainda.</p>
            ) : (
              <div className="space-y-3">
                {notes.map(note => {
                  const initials = note.author?.full_name.split(' ').filter(Boolean).slice(0,2).map(n => n[0].toUpperCase()).join('') ?? '?'
                  const canDelete = currentMemberId && note.author_id === currentMemberId
                  const isOptimistic = note.id.startsWith('optimistic-')
                  return (
                    <div key={note.id} className={`flex items-start gap-2 ${isOptimistic ? 'opacity-60' : ''}`}>
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-[9px] font-semibold text-slate-600 flex items-center justify-center shrink-0 mt-0.5">{initials}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-slate-700">{note.author?.full_name ?? 'A guardar...'}</span>
                        </div>
                        <p className="text-xs text-slate-600 whitespace-pre-wrap break-words">{note.content}</p>
                      </div>
                      {canDelete && !isOptimistic && (
                        <button onClick={() => handleDeleteNote(note.id)} disabled={deletingNoteId === note.id}
                          className="shrink-0 text-slate-300 hover:text-red-400 transition-colors disabled:opacity-40">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100" />

          {/* Files */}
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
                      className="shrink-0 text-slate-300 hover:text-slate-600 transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={() => handleUnlink(link.id)} disabled={unlinkingId === link.id}
                      className="shrink-0 text-slate-300 hover:text-red-400 transition-colors disabled:opacity-40">
                      {unlinkingId === link.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File picker modal */}
      {showFilePicker && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={() => setShowFilePicker(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[60vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-800">Ligar ficheiro existente</span>
              <button onClick={() => setShowFilePicker(false)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
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
