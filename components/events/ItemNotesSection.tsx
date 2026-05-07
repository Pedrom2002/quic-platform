'use client'

import { useState, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'
import { addItemNoteAction, deleteItemNoteAction } from '@/app/dashboard/events/[eventId]/checklist/actions'
import type { ChecklistItemNote } from '@/types/app'
import { Trash2, FileText } from 'lucide-react'

interface ItemNotesSectionProps {
  eventId: string
  itemId: string
  initialNotes: ChecklistItemNote[]
  currentMemberId: string | null
}

export default function ItemNotesSection({ eventId, itemId, initialNotes, currentMemberId }: ItemNotesSectionProps) {
  const [notes, setNotes] = useState<ChecklistItemNote[]>(initialNotes)
  const [content, setContent] = useState('')
  const [isAdding, startAddTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleAdd() {
    const trimmed = content.trim()
    if (!trimmed) return

    const optimisticId = `optimistic-${Date.now()}`
    const optimisticNote: ChecklistItemNote = {
      id: optimisticId,
      checklist_item_id: itemId,
      event_id: eventId,
      organization_id: '',
      author_id: currentMemberId,
      content: trimmed,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: null,
    }
    setNotes(prev => [optimisticNote, ...prev])
    setContent('')

    startAddTransition(async () => {
      const note = await addItemNoteAction(eventId, itemId, trimmed)
      setNotes(prev =>
        note
          ? prev.map(n => n.id === optimisticId ? note : n)
          : prev.filter(n => n.id !== optimisticId)
      )
    })
  }

  function handleDelete(noteId: string) {
    setDeletingId(noteId)
    setNotes(prev => prev.filter(n => n.id !== noteId))
    startAddTransition(async () => {
      await deleteItemNoteAction(eventId, itemId, noteId)
      setDeletingId(null)
    })
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Notas</span>
        <span className="text-xs text-slate-400">{notes.length}</span>
      </div>

      <div className="mb-3">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Adicionar nota..."
          rows={2}
          aria-label="Conteúdo da nota"
          className="w-full text-sm text-slate-700 placeholder-slate-300 border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-slate-300"
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd() }}
        />
        <div className="flex justify-end mt-1.5">
          <button
            onClick={handleAdd}
            disabled={isAdding || !content.trim()}
            className="text-xs font-medium px-3 py-1.5 bg-slate-900 text-white rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors"
          >
            {isAdding ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {!notes.length ? (
          <p className="text-xs text-slate-400 text-center py-2">Sem notas ainda.</p>
        ) : (
          notes.map(note => {
            const initials = note.author?.full_name
              .split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('') ?? '?'
            const canDelete = currentMemberId && note.author_id === currentMemberId
            const isOptimistic = note.id.startsWith('optimistic-')
            return (
              <div key={note.id} className={`flex items-start gap-2 ${isOptimistic ? 'opacity-60' : ''}`}>
                <span className="w-6 h-6 rounded-full bg-slate-100 text-[9px] font-semibold text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                  {initials}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-slate-700">{note.author?.full_name ?? 'A guardar...'}</span>
                    <span className="text-[10px] text-slate-300">
                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: pt })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap break-words">{note.content}</p>
                </div>
                {canDelete && !isOptimistic && (
                  <button
                    onClick={() => handleDelete(note.id)}
                    disabled={deletingId === note.id}
                    className="shrink-0 text-slate-300 hover:text-red-400 transition-colors disabled:opacity-40"
                    aria-label="Apagar nota"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
