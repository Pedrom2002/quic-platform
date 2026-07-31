'use client'

import { useTransition } from 'react'
import { FileText, Trash2 } from 'lucide-react'
import {
  addTaskNoteAction,
  deleteTaskNoteAction,
} from '@/app/dashboard/events/[eventId]/tasks/actions'
import type { EventTaskNote } from '@/types/app'

interface TaskSidePanelNotesProps {
  eventId: string
  taskId: string
  currentMemberId: string | null
  notes: EventTaskNote[] | null
  setNotes: (updater: EventTaskNote[] | null | ((prev: EventTaskNote[] | null) => EventTaskNote[] | null)) => void
  noteContent: string
  setNoteContent: (value: string) => void
  deletingNoteId: string | null
  setDeletingNoteId: (value: string | null) => void
}

export default function TaskSidePanelNotes({
  eventId, taskId, currentMemberId,
  notes, setNotes, noteContent, setNoteContent, deletingNoteId, setDeletingNoteId,
}: TaskSidePanelNotesProps) {
  const [, startTransition] = useTransition()

  function handleAddNote() {
    const trimmed = noteContent.trim()
    if (!trimmed) return
    const optimisticId = `optimistic-${Date.now()}`
    const optimistic: EventTaskNote = {
      id: optimisticId, task_id: taskId, event_id: eventId, organization_id: '',
      author_id: currentMemberId, content: trimmed,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(), author: null,
    }
    setNotes(prev => prev ? [optimistic, ...prev] : [optimistic])
    setNoteContent('')
    startTransition(async () => {
      const note = await addTaskNoteAction(eventId, taskId, trimmed)
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
      await deleteTaskNoteAction(eventId, taskId, noteId)
      setDeletingNoteId(null)
    })
  }

  return (
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
  )
}
