'use client'

import { useState } from 'react'
import { isToday, differenceInCalendarDays } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { createTaskAction, updateTaskAction } from '@/app/dashboard/events/[eventId]/tasks/actions'
import type { EventTask, ChecklistItemStatus } from '@/types/app'

const STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  pending: 'A fazer',
  in_progress: 'Em progresso',
  completed: 'Concluído',
  skipped: 'Ignorado',
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

interface OrgMember { id: string; full_name: string }

interface TaskSidePanelFormProps {
  eventId: string
  task: EventTask
  orgMembers: OrgMember[]
  checklistItems: { id: string; title: string; client_label: string | null; status: string }[]
  status: ChecklistItemStatus
  setStatus: (value: ChecklistItemStatus) => void
  assignedTo: string
  setAssignedTo: (value: string) => void
  dueAt: string
  setDueAt: (value: string) => void
  checklistItemId: string
  setChecklistItemId: (value: string) => void
  description: string
  setDescription: (value: string) => void
  saveField: (fields: Parameters<typeof updateTaskAction>[2]) => void
  onCreated: (task: EventTask) => void
}

export default function TaskSidePanelForm({
  eventId, task, orgMembers, checklistItems,
  status, setStatus, assignedTo, setAssignedTo, dueAt, setDueAt,
  checklistItemId, setChecklistItemId, description, setDescription,
  saveField, onCreated,
}: TaskSidePanelFormProps) {
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

  return (
    <>
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
    </>
  )
}
