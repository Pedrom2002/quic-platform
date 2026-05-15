'use client'

import { useState, useEffect } from 'react'
import { calcProgress } from '@/lib/event-status'
import { CheckCircle2, SkipForward, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { ItemWithMemberAndCounts, ChecklistItemStatus } from '@/types/app'
import {
  updateChecklistItemAction,
  loadOrgTeamMembersAction,
  reorderChecklistItemsAction,
  bulkUpdateChecklistStatusAction,
} from '@/app/dashboard/events/[eventId]/checklist/actions'
import TaskDetailPanel from './TaskDetailPanel'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { EditRow, NewItemRow } from './checklist/ChecklistItemForms'
import { KanbanCard } from './checklist/KanbanCard'
import { SortableChecklistItem } from './checklist/ChecklistItemRow'

interface ChecklistBoardProps {
  eventId: string
  initialItems: ItemWithMemberAndCounts[]
  currentMemberId: string | null
}

export function ChecklistBoard({ eventId, initialItems, currentMemberId }: ChecklistBoardProps) {
  const [items, setItems] = useState<ItemWithMemberAndCounts[]>(initialItems)
  const [view, setView] = useState<'list' | 'board'>('list')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [orgMembers, setOrgMembers] = useState<{ id: string; full_name: string }[]>([])

  useEffect(() => {
    loadOrgTeamMembersAction(eventId)
      .then(members => setOrgMembers(members))
      .catch(() => {})
  }, [eventId])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const previousItems = items
    const reordered = arrayMove(items, items.findIndex(i => i.id === active.id), items.findIndex(i => i.id === over.id))
    setItems(reordered)
    try {
      await reorderChecklistItemsAction(eventId, reordered.map(i => i.id))
    } catch (err: unknown) {
      setItems(previousItems)
      toast.error(err instanceof Error ? err.message : 'Erro ao reordenar')
    }
  }

  async function handleBoardDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const statuses: ChecklistItemStatus[] = ['pending', 'in_progress', 'completed', 'skipped']
    const targetStatus = statuses.includes(over.id as ChecklistItemStatus)
      ? (over.id as ChecklistItemStatus)
      : items.find(i => i.id === over.id)?.status
    if (!targetStatus) return
    const draggedItem = items.find(i => i.id === active.id)
    if (!draggedItem || draggedItem.status === targetStatus) return
    const previousStatus = draggedItem.status
    setItems(prev => prev.map(i => i.id === active.id ? { ...i, status: targetStatus } : i))
    try {
      await updateChecklistItemAction(eventId, active.id as string, { status: targetStatus })
    } catch {
      setItems(prev => prev.map(i => i.id === active.id ? { ...i, status: previousStatus } : i))
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function bulkUpdate(status: 'completed' | 'in_progress' | 'skipped') {
    if (!selected.size) return
    setBulkLoading(true)
    const count = selected.size
    try {
      await bulkUpdateChecklistStatusAction(eventId, Array.from(selected), status)
      setItems(prev => prev.map(i =>
        selected.has(i.id) ? { ...i, status, completed_at: status === 'completed' ? new Date().toISOString() : null } : i
      ))
      setSelected(new Set())
      toast.success(`${count} etapa${count !== 1 ? 's' : ''} atualizadas`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setBulkLoading(false)
    }
  }

  async function patch(itemId: string, body: object) {
    const res = await fetch(`/api/events/${eventId}/checklist-items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error((await res.json()).error ?? 'Erro')
    return (await res.json()).item
  }

  async function updateStatus(itemId: string, status: 'in_progress' | 'completed' | 'skipped' | 'pending') {
    setLoadingId(itemId)
    try {
      const item = await patch(itemId, { status })
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...item } : i))
      if (status === 'completed') toast.success(`"${item.client_label ?? item.title}" concluído — notificações enviadas`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoadingId(null)
    }
  }

  async function saveEdit(itemId: string, edits: Partial<ItemWithMemberAndCounts>) {
    setLoadingId(itemId)
    try {
      const item = await patch(itemId, edits)
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...item } : i))
      setEditingId(null)
      toast.success('Etapa atualizada')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoadingId(null)
    }
  }

  async function deleteItem(itemId: string) {
    setLoadingId(itemId)
    try {
      const res = await fetch(`/api/events/${eventId}/checklist-items/${itemId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erro')
      setItems(prev => prev.filter(i => i.id !== itemId))
      toast.success('Etapa removida')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoadingId(null)
    }
  }

  async function addItem(fields: { title: string; clientLabel: string; assignedTo: string }) {
    setAddingItem(true)
    try {
      const maxPos = items.reduce((max, i) => Math.max(max, i.position), 0)
      const res = await fetch(`/api/events/${eventId}/checklist-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: fields.title.trim(),
          client_label: fields.clientLabel || fields.title.trim(),
          is_client_visible: true,
          assigned_to: fields.assignedTo || null,
          position: maxPos + 10,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const { item } = await res.json() as { item: ItemWithMemberAndCounts }
      setItems(prev => [...prev, item])
      setShowNewForm(false)
      toast.success('Etapa adicionada')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setAddingItem(false)
    }
  }

  const total = items.length
  const completed = items.filter(i => i.status === 'completed').length
  const percent = calcProgress(completed, total)

  const colLabels: Record<ChecklistItemStatus, string> = {
    pending: 'A fazer',
    in_progress: 'Em progresso',
    completed: 'Concluído',
    skipped: 'Ignorado',
  }
  const colColors: Record<ChecklistItemStatus, string> = {
    pending: 'border-amber-200 bg-amber-50/40',
    in_progress: 'border-blue-200 bg-blue-50/40',
    completed: 'border-green-200 bg-green-50/40',
    skipped: 'border-slate-200 bg-slate-50/40',
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-500">Progresso</span>
          <span className="text-sm font-semibold text-slate-800">{completed}/{total} etapas · {percent}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {/* Add item */}
      <div className="mb-4">
        {showNewForm ? (
          <NewItemRow
            orgMembers={orgMembers}
            isLoading={addingItem}
            onSave={addItem}
            onCancel={() => setShowNewForm(false)}
          />
        ) : (
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 border border-dashed border-slate-200 hover:border-slate-300 rounded-xl bg-white hover:bg-slate-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar nova etapa
          </button>
        )}
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-end mb-3">
        <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5">
          {(['list', 'board'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                view === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {v === 'list' ? 'Lista' : 'Board'}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex items-center gap-2 mb-3 p-3 bg-slate-900 text-white rounded-xl shadow-lg">
          <span className="text-sm font-medium flex-1">
            {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
          </span>
          <Button size="sm" disabled={bulkLoading}
            className="h-7 px-3 text-xs bg-green-600 hover:bg-green-500 text-white border-0"
            onClick={() => bulkUpdate('completed')}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Concluído
          </Button>
          <Button size="sm" disabled={bulkLoading}
            className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-500 text-white border-0"
            onClick={() => bulkUpdate('in_progress')}>
            Em Progresso
          </Button>
          <Button size="sm" disabled={bulkLoading}
            className="h-7 px-3 text-xs bg-slate-600 hover:bg-slate-500 text-white border-0"
            onClick={() => bulkUpdate('skipped')}>
            <SkipForward className="w-3.5 h-3.5 mr-1" />Saltar
          </Button>
          <Button size="sm" variant="ghost" disabled={bulkLoading}
            className="h-7 px-2 text-white/60 hover:text-white hover:bg-slate-700"
            onClick={() => setSelected(new Set())}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 mb-4">
              {items.map(item =>
                editingId === item.id ? (
                  <EditRow
                    key={item.id}
                    item={item}
                    orgMembers={orgMembers}
                    onSave={edits => saveEdit(item.id, edits)}
                    onCancel={() => setEditingId(null)}
                    isLoading={loadingId === item.id}
                  />
                ) : (
                  <SortableChecklistItem
                    key={item.id}
                    item={item}
                    orgMembers={orgMembers}
                    isLoading={loadingId === item.id}
                    isSelected={selected.has(item.id)}
                    onToggleSelect={() => toggleSelect(item.id)}
                    onComplete={() => updateStatus(item.id, 'completed')}
                    onStart={() => updateStatus(item.id, 'in_progress')}
                    onSkip={() => updateStatus(item.id, 'skipped')}
                    onReset={() => updateStatus(item.id, 'pending')}
                    onEdit={() => setEditingId(item.id)}
                    onDelete={() => deleteItem(item.id)}
                    onOpenDetail={() => setSelectedItemId(item.id)}
                  />
                )
              )}
              {!items.length && (
                <p className="text-slate-400 text-sm text-center py-8">Nenhuma etapa adicionada ainda.</p>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Board view */}
      {view === 'board' && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBoardDragEnd}>
          <div className="grid grid-cols-4 gap-4 mb-4">
            {(['pending', 'in_progress', 'completed', 'skipped'] as ChecklistItemStatus[]).map(col => {
              const colItems = items.filter(i => i.status === col)
              return (
                <div key={col} className={`rounded-xl border ${colColors[col]} p-3 min-h-[200px]`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-slate-600">{colLabels[col]}</span>
                    <span className="text-xs text-slate-400 ml-auto">{colItems.length}</span>
                  </div>
                  <SortableContext items={colItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    {colItems.length === 0 ? (
                      <div className="border border-dashed border-slate-200 rounded-lg p-3 text-center text-xs text-slate-300">
                        Sem tarefas
                      </div>
                    ) : (
                      colItems.map(item => (
                        <KanbanCard key={item.id} item={item} onClick={() => setSelectedItemId(item.id)} />
                      ))
                    )}
                  </SortableContext>
                </div>
              )
            })}
          </div>
        </DndContext>
      )}

      {/* Task detail panel */}
      {selectedItemId && (() => {
        const selectedItem = items.find(i => i.id === selectedItemId)
        if (!selectedItem) return null
        return (
          <TaskDetailPanel
            eventId={eventId}
            item={selectedItem}
            orgMembers={orgMembers}
            currentMemberId={currentMemberId}
            onClose={() => setSelectedItemId(null)}
            onUpdate={updated => setItems(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i))}
          />
        )
      })()}
    </div>
  )
}
