'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, SkipForward, EyeOff, Loader2, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import type { ItemWithMemberAndCounts } from '@/types/app'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DraggableAttributes } from '@dnd-kit/core'

type ItemWithMember = ItemWithMemberAndCounts

export interface ChecklistItemProps {
  item: ItemWithMember
  orgMembers: { id: string; full_name: string }[]
  isLoading: boolean
  isSelected: boolean
  onToggleSelect: () => void
  onComplete: () => void
  onStart: () => void
  onSkip: () => void
  onReset: () => void
  onEdit: () => void
  onDelete: () => void
  onOpenDetail: () => void
  dragHandleProps: {
    ref: (node: HTMLElement | null) => void
    style: React.CSSProperties
    isDragging: boolean
    listeners: ReturnType<typeof useSortable>['listeners']
    attributes: DraggableAttributes
  }
}

export function SortableChecklistItem(props: Omit<ChecklistItemProps, 'dragHandleProps'>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.item.id })

  return (
    <ChecklistItem
      {...props}
      dragHandleProps={{
        ref: setNodeRef,
        style: { transform: CSS.Transform.toString(transform), transition },
        isDragging,
        listeners,
        attributes,
      }}
    />
  )
}

function ChecklistItem({
  item, orgMembers, isLoading, isSelected,
  onToggleSelect, onComplete, onStart, onSkip, onReset, onDelete, onOpenDetail,
  dragHandleProps,
}: ChecklistItemProps) {
  const isCompleted = item.status === 'completed'
  const isSkipped = item.status === 'skipped'
  const isInProgress = item.status === 'in_progress'
  const isPending = item.status === 'pending'
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      ref={dragHandleProps.ref}
      style={dragHandleProps.style}
      onClick={onOpenDetail}
      className={cn(
        'flex items-center gap-3 p-4 rounded-xl border transition-all group cursor-pointer',
        dragHandleProps.isDragging ? 'opacity-50 shadow-lg' : '',
        isCompleted ? 'bg-green-50 border-green-200'
          : isSkipped ? 'bg-slate-50 border-slate-200 opacity-60'
          : isInProgress ? 'bg-blue-50 border-blue-200'
          : 'bg-white border-slate-200 hover:border-slate-300'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <button
        {...(dragHandleProps.listeners ?? {})}
        {...dragHandleProps.attributes}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 touch-none"
        onClick={e => e.stopPropagation()}
        aria-label="Reordenar"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        className="w-4 h-4 rounded border-slate-300 text-slate-700 cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 transition-opacity checked:opacity-100"
        onClick={e => e.stopPropagation()}
      />

      <button
        onClick={e => { e.stopPropagation(); (isCompleted || isSkipped ? onReset : onComplete)() }}
        disabled={isLoading}
        className="shrink-0"
      >
        {isLoading ? <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
          : isCompleted ? <CheckCircle2 className="w-5 h-5 text-green-500" />
          : isSkipped ? <SkipForward className="w-5 h-5 text-slate-400" />
          : <Circle className={cn('w-5 h-5 transition-colors', isInProgress ? 'text-blue-400' : 'text-slate-300 hover:text-slate-500')} />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn('text-sm font-medium', isCompleted ? 'text-slate-400 line-through' : 'text-slate-800')}>
            {item.title}
          </p>
          {item.client_label && item.client_label !== item.title && (
            <span className="text-xs text-slate-400">({item.client_label})</span>
          )}
          {!item.is_client_visible && <EyeOff className="w-3 h-3 text-slate-300 shrink-0" />}
          {(() => {
            const member = item.assigned_member ?? orgMembers.find(m => m.id === item.assigned_to) ?? null
            if (!member) return null
            const initials = member.full_name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')
            return (
              <span title={member.full_name} className="w-5 h-5 rounded-full bg-slate-100 text-[9px] font-semibold text-slate-600 flex items-center justify-center shrink-0">
                {initials}
              </span>
            )
          })()}
        </div>
        {isCompleted && item.completed_at && (
          <p className="text-xs text-slate-400 mt-0.5">
            Concluído {format(new Date(item.completed_at), "d MMM · HH'h'mm", { locale: pt })}
            {item.completion_note && ` · ${item.completion_note}`}
          </p>
        )}
        {isInProgress && <p className="text-xs text-blue-500 mt-0.5">Em progresso</p>}
      </div>

      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
        {!isCompleted && !isSkipped && (
          <>
            {isPending && (
              <Button size="sm" variant="ghost" onClick={onStart} disabled={isLoading}
                className="text-xs text-slate-400 hover:text-slate-700 h-7 px-2">Iniciar</Button>
            )}
            <Button size="sm" onClick={onComplete} disabled={isLoading}
              className={cn('h-7 px-3 text-xs', isInProgress && 'bg-green-600 hover:bg-green-500 text-white')}>
              Concluir
            </Button>
            <Button size="sm" variant="ghost" onClick={onSkip} disabled={isLoading}
              className="text-xs text-slate-400 hover:text-slate-700 h-7 px-2">Ignorar</Button>
          </>
        )}
        {(isCompleted || isSkipped) && (
          <Button size="sm" variant="ghost" onClick={onReset} disabled={isLoading}
            className="text-xs text-slate-400 hover:text-slate-700 h-7 px-2">Repor</Button>
        )}
        <div className={cn('flex items-center gap-0.5 transition-opacity', showActions ? 'opacity-100' : 'opacity-0')}>
          <Button size="sm" variant="ghost" onClick={onDelete} disabled={isLoading}
            className="h-7 w-7 p-0 text-slate-300 hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
