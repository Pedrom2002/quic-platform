'use client'

import { useState, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'
import { addNoteAction, deleteNoteAction } from '@/app/dashboard/events/[eventId]/notes/actions'
import type { EventNoteWithAuthor } from '@/types/app'
import { Trash2, FileText } from 'lucide-react'

interface NotesSectionProps {
  eventId: string
  initialNotes: EventNoteWithAuthor[]
  currentMemberId: string | null
}

export default function NotesSection({ eventId, initialNotes, currentMemberId }: NotesSectionProps) {
  const [notes, setNotes] = useState<EventNoteWithAuthor[]>(initialNotes)
  const [content, setContent] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    const trimmed = content.trim()
    if (!trimmed) return
    startTransition(async () => {
      const note = await addNoteAction(eventId, trimmed)
      if (note) {
        setNotes(prev => [note, ...prev])
        setContent('')
      }
    })
  }

  function handleDelete(noteId: string) {
    startTransition(async () => {
      const ok = await deleteNoteAction(eventId, noteId)
      if (ok) setNotes(prev => prev.filter(n => n.id !== noteId))
    })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <FileText className="w-4 h-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-800">Notas internas</h2>
        <span className="ml-auto text-xs text-slate-400">{notes.length}</span>
      </div>

      {/* Add note form */}
      <div className="px-5 py-4 border-b border-slate-100">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Adicionar nota..."
          rows={3}
          className="w-full text-sm text-slate-700 placeholder-slate-300 border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-slate-300"
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd()
          }}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleAdd}
            disabled={isPending || !content.trim()}
            className="text-xs font-medium px-3 py-1.5 bg-slate-900 text-white rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors"
          >
            {isPending ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div className="divide-y divide-slate-100">
        {!notes.length ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">Sem notas ainda.</p>
        ) : (
          notes.map(note => {
            const initials = note.author?.full_name
              .split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('') ?? '?'
            const canDelete = currentMemberId && (note.author_id === currentMemberId)
            return (
              <div key={note.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                    {initials}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-slate-700">{note.author?.full_name ?? 'Desconhecido'}</span>
                      <span className="text-xs text-slate-300">
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: pt })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap break-words">{note.content}</p>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(note.id)}
                      disabled={isPending}
                      className="shrink-0 text-slate-300 hover:text-red-400 transition-colors disabled:opacity-40"
                      aria-label="Apagar nota"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
