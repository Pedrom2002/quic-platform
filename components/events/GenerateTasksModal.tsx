'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, Loader2, ChevronRight } from 'lucide-react'
import { createTaskAction } from '@/app/dashboard/events/[eventId]/tasks/actions'
import type { EventTask } from '@/types/app'

interface GeneratedTask {
  title: string
  subtasks: { title: string }[]
}

interface Props {
  eventId: string
  onClose: () => void
  onTasksCreated: (tasks: EventTask[]) => void
}

const EVENT_TYPES = [
  'Festival de Música',
  'Conferência',
  'Casamento',
  'Evento Corporativo',
  'Concerto',
  'Desfile',
  'Outro',
]

export default function GenerateTasksModal({ eventId, onClose, onTasksCreated }: Props) {
  const [phase, setPhase] = useState<'form' | 'preview'>('form')
  const [eventType, setEventType] = useState('')
  const [customType, setCustomType] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [notes, setNotes] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [parsedTasks, setParsedTasks] = useState<GeneratedTask[]>([])
  const [inserting, setInserting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleGenerate() {
    const type = eventType === 'Outro' ? customType : eventType
    if (!type || !guestCount || !eventDate) return
    setPhase('preview')
    setStreaming(true)
    setParsedTasks([])
    setError(null)

    try {
      const res = await fetch('/api/ai/generate-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          eventType: type,
          guestCount: Number(guestCount),
          eventDate,
          notes,
        }),
      })

      if (!res.ok || !res.body) {
        setError('Erro ao gerar. Tenta novamente.')
        setStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
      }

      try {
        const jsonStart = accumulated.indexOf('[')
        const jsonEnd = accumulated.lastIndexOf(']')
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const parsed = JSON.parse(accumulated.slice(jsonStart, jsonEnd + 1)) as GeneratedTask[]
          setParsedTasks(parsed)
        } else {
          setError('Resposta inválida. Tenta novamente.')
        }
      } catch {
        setError('Erro ao processar resposta. Tenta novamente.')
      }
    } catch {
      setError('Erro de ligação. Tenta novamente.')
    } finally {
      setStreaming(false)
    }
  }

  async function handleInsert() {
    if (!parsedTasks.length || inserting) return
    setInserting(true)
    const created: EventTask[] = []
    for (const root of parsedTasks) {
      const rootTask = await createTaskAction(eventId, { title: root.title })
      if (rootTask) {
        created.push(rootTask)
        for (const sub of root.subtasks ?? []) {
          const subTask = await createTaskAction(eventId, { title: sub.title, parentId: rootTask.id })
          if (subTask) created.push(subTask)
        }
      }
    }
    onTasksCreated(created)
    onClose()
  }

  const totalCount = parsedTasks.reduce((acc, t) => acc + 1 + (t.subtasks?.length ?? 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-semibold text-slate-800">Gerar tarefas com IA</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {phase === 'form' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de evento</label>
                <select
                  value={eventType}
                  onChange={e => setEventType(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                >
                  <option value="">Selecionar...</option>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {eventType === 'Outro' && (
                  <input
                    type="text"
                    value={customType}
                    onChange={e => setCustomType(e.target.value)}
                    placeholder="Descreve o tipo de evento..."
                    className="mt-2 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Número de pessoas</label>
                <input
                  type="number"
                  value={guestCount}
                  onChange={e => setGuestCount(e.target.value)}
                  min={1}
                  placeholder="ex: 200"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Data do evento</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={e => setEventDate(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Notas adicionais <span className="text-slate-400">(opcional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Requisitos especiais, tema, localização..."
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none"
                />
              </div>
            </div>
          )}

          {phase === 'preview' && (
            <div>
              {streaming && parsedTasks.length === 0 && (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  A gerar tarefas...
                </div>
              )}
              {error && (
                <p className="text-sm text-red-500 py-4">{error}</p>
              )}
              {parsedTasks.length > 0 && (
                <div className="space-y-2">
                  {parsedTasks.map((task, i) => (
                    <div key={i} className="border border-slate-100 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-slate-50 text-sm font-medium text-slate-800">{task.title}</div>
                      {task.subtasks?.map((sub, j) => (
                        <div key={j} className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 border-t border-slate-50">
                          <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                          {sub.title}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancelar
          </button>
          {phase === 'form' ? (
            <button
              onClick={handleGenerate}
              disabled={!eventType || (eventType === 'Outro' && !customType) || !guestCount || !eventDate}
              className="text-sm font-medium px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Gerar
            </button>
          ) : (
            <button
              onClick={handleInsert}
              disabled={streaming || parsedTasks.length === 0 || inserting}
              className="text-sm font-medium px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {inserting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Inserir {totalCount > 0 ? `${totalCount} tarefas` : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
