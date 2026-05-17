'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { format, differenceInCalendarDays, isToday } from 'date-fns'
import { pt } from 'date-fns/locale'
import { X } from 'lucide-react'
import {
  updateChecklistItemAction,
  loadItemNotesAction,
  loadItemFilesAction,
} from '@/app/dashboard/events/[eventId]/checklist/actions'
import ItemNotesSection from './ItemNotesSection'
import ItemFilesSection from './ItemFilesSection'
import type { ItemWithMemberAndCounts, ChecklistItemNote, ChecklistItemFileLink, ChecklistItemStatus } from '@/types/app'

const STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  pending: 'A fazer',
  in_progress: 'Em progresso',
  completed: 'Concluído',
  skipped: 'Ignorado',
}

interface OrgMember { id: string; full_name: string }

interface TaskDetailPanelProps {
  eventId: string
  item: ItemWithMemberAndCounts
  orgMembers: OrgMember[]
  currentMemberId: string | null
  onClose: () => void
  onUpdate: (updated: Partial<ItemWithMemberAndCounts> & { id: string }) => void
}

function OverdueIndicator({ dueAt, status }: { dueAt: string | null; status: ChecklistItemStatus }) {
  if (!dueAt || status === 'completed' || status === 'skipped') return null
  const due = new Date(dueAt)
  const now = new Date()
  if (isToday(due)) return <span className="ml-2 text-xs font-medium text-orange-500">Hoje</span>
  const days = differenceInCalendarDays(due, now)
  if (days < 0) return <span className="ml-2 text-xs font-medium text-red-500">{Math.abs(days)}d em atraso</span>
  if (days <= 3) return <span className="ml-2 text-xs font-medium text-amber-500">{days}d</span>
  return null
}

export default function TaskDetailPanel({ eventId, item, orgMembers, currentMemberId, onClose, onUpdate }: TaskDetailPanelProps) {
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description ?? '')
  const [status, setStatus] = useState<ChecklistItemStatus>(item.status)
  const [assignedTo, setAssignedTo] = useState<string>(item.assigned_to ?? '')
  const [dueAt, setDueAt] = useState<string>(
    item.due_at ? format(new Date(item.due_at), "yyyy-MM-dd'T'HH:mm") : ''
  )
  const [notes, setNotes] = useState<ChecklistItemNote[] | null>(null)
  const [fileLinks, setFileLinks] = useState<ChecklistItemFileLink[] | null>(null)
  const [, startTransition] = useTransition()
  const titleRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<Element | null>(null)

  useEffect(() => {
    loadItemNotesAction(eventId, item.id).then(setNotes)
    loadItemFilesAction(eventId, item.id).then(setFileLinks)
  }, [eventId, item.id])

  useEffect(() => {
    previousFocusRef.current = document.activeElement
    titleRef.current?.focus()
    return () => {
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus()
      }
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function saveField(fields: Parameters<typeof updateChecklistItemAction>[2]) {
    startTransition(async () => {
      const updated = await updateChecklistItemAction(eventId, item.id, fields)
      if (updated) onUpdate({ id: item.id, ...fields })
    })
  }

  function handleStatusChange(newStatus: ChecklistItemStatus) {
    setStatus(newStatus)
    saveField({ status: newStatus })
  }

  function handleAssigneeChange(memberId: string) {
    setAssignedTo(memberId)
    saveField({ assigned_to: memberId || null })
  }

  function handleDueAtChange(value: string) {
    setDueAt(value)
    saveField({ due_at: value ? new Date(value).toISOString() : null })
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes: ${item.title}`}
        className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100">
          <input
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== item.title && saveField({ title: title.trim() })}
            className="flex-1 text-base font-semibold text-slate-900 focus:outline-none bg-transparent"
            placeholder="Título da tarefa"
            aria-label="Título da tarefa"
          />
          <button onClick={onClose} aria-label="Fechar painel" className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Status + Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide block mb-1">Estado</label>
              <select
                value={status}
                onChange={e => handleStatusChange(e.target.value as ChecklistItemStatus)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white"
              >
                {(Object.keys(STATUS_LABELS) as ChecklistItemStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide block mb-1">Responsável</label>
              <select
                value={assignedTo}
                onChange={e => handleAssigneeChange(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white"
              >
                <option value="">Sem atribuição</option>
                {orgMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide block mb-1">
              Data limite
              {dueAt && <OverdueIndicator dueAt={new Date(dueAt).toISOString()} status={status} />}
            </label>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={e => handleDueAtChange(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-300"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide block mb-1">Descrição</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={() => saveField({ description: description || null })}
              rows={3}
              placeholder="Adicionar descrição..."
              className="w-full text-sm text-slate-700 placeholder-slate-300 border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-slate-300"
            />
          </div>

          <div className="border-t border-slate-100" />

          {/* Notes */}
          {notes !== null ? (
            <ItemNotesSection
              eventId={eventId}
              itemId={item.id}
              initialNotes={notes}
              currentMemberId={currentMemberId}
            />
          ) : (
            <p className="text-xs text-slate-400">A carregar notas...</p>
          )}

          <div className="border-t border-slate-100" />

          {/* Files */}
          {fileLinks !== null ? (
            <ItemFilesSection
              eventId={eventId}
              itemId={item.id}
              initialFiles={fileLinks}
            />
          ) : (
            <p className="text-xs text-slate-400">A carregar ficheiros...</p>
          )}

        </div>
      </div>
    </>
  )
}
