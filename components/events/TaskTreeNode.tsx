'use client'

import { useState, useTransition } from 'react'
import { ChevronRight, ChevronDown, Plus, Trash2 } from 'lucide-react'
import { format, differenceInCalendarDays, isToday, isPast } from 'date-fns'
import { pt } from 'date-fns/locale'
import { createTaskAction, updateTaskAction, deleteTaskAction } from '@/app/dashboard/events/[eventId]/tasks/actions'
import type { EventTask, EventTaskNode, ChecklistItemStatus } from '@/types/app'
import { calcProgress } from './TaskTree'

const STATUS_COLORS: Record<ChecklistItemStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  skipped: 'bg-slate-100 text-slate-500',
}

const STATUS_NEXT: Record<ChecklistItemStatus, ChecklistItemStatus> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: 'pending',
  skipped: 'pending',
}

const STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  pending: 'A fazer',
  in_progress: 'Em progresso',
  completed: 'Concluído',
  skipped: 'Ignorado',
}

interface OrgMember { id: string; full_name: string }

interface TaskTreeNodeProps {
  node: EventTaskNode
  depth: number
  eventId: string
  orgMembers: OrgMember[]
  expandedIds: Set<string>
  selectedTaskId: string | null
  onToggleExpand: (id: string) => void
  onSelect: (id: string) => void
  onUpdate: (updated: Partial<EventTask> & { id: string }) => void
  onDelete: (id: string) => void
  onCreated: (task: EventTask) => void
}

export default function TaskTreeNode({
  node, depth, eventId, orgMembers, expandedIds, selectedTaskId,
  onToggleExpand, onSelect, onUpdate, onDelete, onCreated,
}: TaskTreeNodeProps) {
  const isExpanded = expandedIds.has(node.id)
  const hasChildren = node.children.length > 0
  const isSelected = selectedTaskId === node.id
  const [addingSub, setAddingSub] = useState(false)
  const [subTitle, setSubTitle] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [, startTransition] = useTransition()

  const progress = hasChildren ? calcProgress(node) : null

  const isOverdue = !!(node.due_at && node.status !== 'completed' && node.status !== 'skipped'
    && isPast(new Date(node.due_at)) && !isToday(new Date(node.due_at)))

  const indentPx = Math.min(depth, 8) * 20

  function handleStatusClick(e: React.MouseEvent) {
    e.stopPropagation()
    const newStatus = STATUS_NEXT[node.status]
    onUpdate({ id: node.id, status: newStatus })
    startTransition(async () => {
      await updateTaskAction(eventId, node.id, { status: newStatus })
    })
  }

  function handleAddSub() {
    const trimmed = subTitle.trim()
    if (!trimmed) return
    setSubTitle('')
    setAddingSub(false)
    startTransition(async () => {
      const task = await createTaskAction(eventId, { title: trimmed, parentId: node.id })
      if (task) onCreated(task)
    })
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirmDelete) { setConfirmDelete(true); return }
    onDelete(node.id)
    startTransition(async () => {
      await deleteTaskAction(eventId, node.id)
    })
  }

  return (
    <div>
      {/* Row */}
      <div
        onClick={() => onSelect(node.id)}
        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer group transition-colors ${
          isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50'
        }`}
        style={{ paddingLeft: `${indentPx + 8}px` }}
      >
        {/* Expand chevron */}
        <button
          onClick={e => { e.stopPropagation(); if (hasChildren) onToggleExpand(node.id) }}
          className={`shrink-0 w-4 h-4 flex items-center justify-center text-slate-400 ${hasChildren ? 'hover:text-slate-700' : 'opacity-0 pointer-events-none'}`}
        >
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Status badge */}
        <button
          onClick={handleStatusClick}
          className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_COLORS[node.status]}`}
        >
          {STATUS_LABELS[node.status]}
        </button>

        {/* Title */}
        <span className={`flex-1 text-sm min-w-0 truncate ${node.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
          {node.title}
        </span>

        {/* Progress */}
        {progress && (
          <span className="shrink-0 text-[10px] text-slate-400 font-medium">
            {progress.completed}/{progress.total}
          </span>
        )}

        {/* Assignee */}
        {node.assigned_member && (
          <span className="shrink-0 w-5 h-5 rounded-full bg-slate-200 text-[9px] font-semibold text-slate-600 flex items-center justify-center">
            {node.assigned_member.full_name.split(' ').filter(Boolean).slice(0,2).map(n => n[0].toUpperCase()).join('')}
          </span>
        )}

        {/* Due date */}
        {node.due_at && (
          <span className={`shrink-0 text-[10px] font-medium ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
            {isOverdue
              ? `${Math.abs(differenceInCalendarDays(new Date(node.due_at), new Date()))}d atraso`
              : isToday(new Date(node.due_at))
              ? 'Hoje'
              : format(new Date(node.due_at), 'd MMM', { locale: pt })
            }
          </span>
        )}

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <button
            onClick={e => { e.stopPropagation(); setAddingSub(true) }}
            className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Adicionar sub-tarefa"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className={`p-1 transition-colors ${confirmDelete ? 'text-red-500 hover:text-red-700' : 'text-slate-400 hover:text-red-400'}`}
            aria-label={confirmDelete ? 'Confirmar eliminação' : 'Eliminar'}
            onBlur={() => setConfirmDelete(false)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Add sub-task input */}
      {addingSub && (
        <div
          className="flex items-center gap-2 py-1 px-2 ml-1 rounded-lg bg-slate-50 border border-slate-200 mt-0.5 mb-0.5"
          style={{ paddingLeft: `${indentPx + 32}px` }}
        >
          <input
            autoFocus
            type="text"
            value={subTitle}
            onChange={e => setSubTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddSub()
              if (e.key === 'Escape') { setAddingSub(false); setSubTitle('') }
            }}
            placeholder="Título da sub-tarefa..."
            className="flex-1 text-sm bg-transparent focus:outline-none"
          />
          <button onClick={handleAddSub} className="text-xs font-medium px-2 py-0.5 bg-slate-900 text-white rounded">OK</button>
          <button onClick={() => { setAddingSub(false); setSubTitle('') }} className="text-xs text-slate-400 hover:text-slate-700">✕</button>
        </div>
      )}

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <TaskTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              eventId={eventId}
              orgMembers={orgMembers}
              expandedIds={expandedIds}
              selectedTaskId={selectedTaskId}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onCreated={onCreated}
            />
          ))}
        </div>
      )}
    </div>
  )
}
