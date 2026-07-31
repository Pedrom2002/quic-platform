'use client'

import type { ItemWithMemberAndCounts, ChecklistItemStatus } from '@/types/app'
import {
  DndContext,
  closestCenter,
  type SensorDescriptor,
  type SensorOptions,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanCard } from './KanbanCard'

const COL_LABELS: Record<ChecklistItemStatus, string> = {
  pending: 'A fazer',
  in_progress: 'Em progresso',
  completed: 'Concluído',
  skipped: 'Ignorado',
}
const COL_COLORS: Record<ChecklistItemStatus, string> = {
  pending: 'border-amber-200 bg-amber-50/40',
  in_progress: 'border-blue-200 bg-blue-50/40',
  completed: 'border-green-200 bg-green-50/40',
  skipped: 'border-slate-200 bg-slate-50/40',
}

const STATUS_COLUMNS: ChecklistItemStatus[] = ['pending', 'in_progress', 'completed', 'skipped']

interface ChecklistBoardViewProps {
  items: ItemWithMemberAndCounts[]
  sensors: SensorDescriptor<SensorOptions>[]
  onDragEnd: (event: DragEndEvent) => void
  onOpenDetail: (id: string) => void
}

export function ChecklistBoardView({ items, sensors, onDragEnd, onOpenDetail }: ChecklistBoardViewProps) {
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-4 gap-4 mb-4">
        {STATUS_COLUMNS.map(col => {
          const colItems = items.filter(i => i.status === col)
          return (
            <div key={col} className={`rounded-xl border ${COL_COLORS[col]} p-3 min-h-[200px]`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-slate-600">{COL_LABELS[col]}</span>
                <span className="text-xs text-slate-400 ml-auto">{colItems.length}</span>
              </div>
              <SortableContext items={colItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                {colItems.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-lg p-3 text-center text-xs text-slate-300">
                    Sem tarefas
                  </div>
                ) : (
                  colItems.map(item => (
                    <KanbanCard key={item.id} item={item} onClick={() => onOpenDetail(item.id)} />
                  ))
                )}
              </SortableContext>
            </div>
          )
        })}
      </div>
    </DndContext>
  )
}
