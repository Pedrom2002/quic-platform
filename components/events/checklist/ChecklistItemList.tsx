'use client'

import type { ItemWithMemberAndCounts } from '@/types/app'
import { EditRow } from './ChecklistItemForms'
import { SortableChecklistItem } from './ChecklistItemRow'

interface ChecklistItemListProps {
  items: ItemWithMemberAndCounts[]
  orgMembers: { id: string; full_name: string }[]
  editingId: string | null
  loadingId: string | null
  selected: Set<string>
  onToggleSelect: (id: string) => void
  onComplete: (id: string) => void
  onStart: (id: string) => void
  onSkip: (id: string) => void
  onReset: (id: string) => void
  onEdit: (id: string) => void
  onCancelEdit: () => void
  onSaveEdit: (id: string, edits: Partial<ItemWithMemberAndCounts>) => void
  onDelete: (id: string) => void
  onOpenDetail: (id: string) => void
}

export function ChecklistItemList({
  items,
  orgMembers,
  editingId,
  loadingId,
  selected,
  onToggleSelect,
  onComplete,
  onStart,
  onSkip,
  onReset,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onOpenDetail,
}: ChecklistItemListProps) {
  return (
    <div className="space-y-2 mb-4">
      {items.map(item =>
        editingId === item.id ? (
          <EditRow
            key={item.id}
            item={item}
            orgMembers={orgMembers}
            onSave={edits => onSaveEdit(item.id, edits)}
            onCancel={onCancelEdit}
            isLoading={loadingId === item.id}
          />
        ) : (
          <SortableChecklistItem
            key={item.id}
            item={item}
            orgMembers={orgMembers}
            isLoading={loadingId === item.id}
            isSelected={selected.has(item.id)}
            onToggleSelect={() => onToggleSelect(item.id)}
            onComplete={() => onComplete(item.id)}
            onStart={() => onStart(item.id)}
            onSkip={() => onSkip(item.id)}
            onReset={() => onReset(item.id)}
            onEdit={() => onEdit(item.id)}
            onDelete={() => onDelete(item.id)}
            onOpenDetail={() => onOpenDetail(item.id)}
          />
        )
      )}
      {!items.length && (
        <p className="text-slate-400 text-sm text-center py-8">Nenhuma etapa adicionada ainda.</p>
      )}
    </div>
  )
}
