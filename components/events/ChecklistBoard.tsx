'use client'

import { useState, useEffect } from 'react'
import { calcProgress } from '@/lib/event-status'
import { Plus, Download } from 'lucide-react'
import { toast } from 'sonner'
import type { ItemWithMemberAndCounts, ChecklistItemStatus } from '@/types/app'
import {
  updateChecklistItemAction,
  loadOrgTeamMembersAction,
  bulkUpdateChecklistStatusAction,
} from '@/app/dashboard/events/[eventId]/checklist/actions'
import { reorderChecklistItemsAction } from '@/app/dashboard/events/[eventId]/checklist/actions-reorder'
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
import { NewItemRow } from './checklist/ChecklistItemForms'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { seedChecklistTasksAction, syncCategoriesToTemplateAction } from '@/app/dashboard/events/[eventId]/checklist/actions-templates'
import { ChecklistProgressHeader } from './checklist/ChecklistProgressHeader'
import { ChecklistBulkBar } from './checklist/ChecklistBulkBar'
import { ChecklistItemList } from './checklist/ChecklistItemList'
import { ChecklistBoardView } from './checklist/ChecklistBoardView'

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
  const [activeTab, setActiveTab] = useState<string>('Todas')
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    loadOrgTeamMembersAction(eventId)
      .then(members => setOrgMembers(members))
      .catch(() => {})
  }, [eventId])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleBoardDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const statuses: ChecklistItemStatus[] = ['pending', 'in_progress', 'completed', 'skipped']
    const rawStatus = statuses.includes(over.id as ChecklistItemStatus)
      ? (over.id as ChecklistItemStatus)
      : items.find(i => i.id === over.id)?.status
    if (!rawStatus) return
    const targetStatus = rawStatus as ChecklistItemStatus
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

  function handleListDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const previousItems = items
    const reordered = arrayMove(
      items,
      items.findIndex(i => i.id === active.id),
      items.findIndex(i => i.id === over.id)
    )
    setItems(reordered)
    reorderChecklistItemsAction(eventId, reordered.map(i => i.id)).catch(() => {
      setItems(previousItems)
      toast.error('Erro ao reordenar')
    })
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

  const categoryOrder = [
    'Estruturas em Falta',
    'Sistema de Som',
    'Sistema de Iluminação',
    'Energia',
    'Artigos Decorativos',
    'Plano de Marketing e Assessoria',
  ]

  const categories: string[] = Array.from(
    new Set(
      items.map(i => i.category ?? 'Geral')
    )
  ).sort((a, b) => {
    if (a === 'Geral') return 1
    if (b === 'Geral') return -1
    const ia = categoryOrder.indexOf(a)
    const ib = categoryOrder.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })

  useEffect(() => {
    if (activeTab !== 'Todas' && !categories.includes(activeTab)) {
      setActiveTab('Todas')
    }
  }, [items, activeTab, categories])

  function itemsForTab(tab: string) {
    if (tab === 'Todas') return items
    return items.filter(i =>
      (i.category ?? 'Geral') === tab
    )
  }

  function tabProgress(tab: string) {
    const tabItems = itemsForTab(tab)
    const done = tabItems.filter(i => i.status === 'completed').length
    return { done, total: tabItems.length }
  }

  async function handleSeed() {
    setSeeding(true)
    try {
      const { inserted: eventInserted } = await seedChecklistTasksAction(eventId)
      const { inserted: templateInserted } = await syncCategoriesToTemplateAction(eventId)
      const res = await fetch(`/api/events/${eventId}/checklist-items`)
      if (res.ok) {
        const { items: fresh } = await res.json() as { items: ItemWithMemberAndCounts[] }
        setItems(fresh)
      } else {
        toast.error('Tarefas importadas mas erro ao recarregar — recarregue a página')
      }
      toast.success(
        eventInserted > 0
          ? `${eventInserted} tarefas adicionadas · ${templateInserted} adicionadas ao template`
          : 'Tarefas já existentes, nenhuma duplicada'
      )
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao importar tarefas')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div>
      <ChecklistProgressHeader completed={completed} total={total} percent={percent} />

      {/* Seed button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {seeding ? 'A importar...' : 'Importar tarefas do evento'}
        </button>
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

      <ChecklistBulkBar
        selectedCount={selected.size}
        bulkLoading={bulkLoading}
        onBulkUpdate={bulkUpdate}
        onClearSelection={() => setSelected(new Set())}
      />

      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 flex-wrap h-auto gap-1 bg-slate-100 p-1 rounded-xl">
          {(() => {
            const { done, total: t } = tabProgress('Todas')
            return (
              <TabsTrigger value="Todas" className="rounded-lg text-xs">
                Todas
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-medium">
                  {done}/{t}
                </span>
              </TabsTrigger>
            )
          })()}
          {categories.map(cat => {
            const { done, total: t } = tabProgress(cat)
            if (t === 0) return null
            return (
              <TabsTrigger key={cat} value={cat} className="rounded-lg text-xs">
                {cat}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                  done === t && t > 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {done}/{t}
                </span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {['Todas', ...categories].map(tab => {
          const tabItems = itemsForTab(tab)
          return (
            <TabsContent key={tab} value={tab}>
              {/* List view */}
              {view === 'list' && (
                tab === 'Todas' ? (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleListDragEnd}>
                    <SortableContext items={tabItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                      <ChecklistItemList
                        items={tabItems}
                        orgMembers={orgMembers}
                        editingId={editingId}
                        loadingId={loadingId}
                        selected={selected}
                        onToggleSelect={toggleSelect}
                        onComplete={id => updateStatus(id, 'completed')}
                        onStart={id => updateStatus(id, 'in_progress')}
                        onSkip={id => updateStatus(id, 'skipped')}
                        onReset={id => updateStatus(id, 'pending')}
                        onEdit={id => setEditingId(id)}
                        onCancelEdit={() => setEditingId(null)}
                        onSaveEdit={saveEdit}
                        onDelete={deleteItem}
                        onOpenDetail={id => setSelectedItemId(id)}
                      />
                    </SortableContext>
                  </DndContext>
                ) : (
                  <ChecklistItemList
                    items={tabItems}
                    orgMembers={orgMembers}
                    editingId={editingId}
                    loadingId={loadingId}
                    selected={selected}
                    onToggleSelect={toggleSelect}
                    onComplete={id => updateStatus(id, 'completed')}
                    onStart={id => updateStatus(id, 'in_progress')}
                    onSkip={id => updateStatus(id, 'skipped')}
                    onReset={id => updateStatus(id, 'pending')}
                    onEdit={id => setEditingId(id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSaveEdit={saveEdit}
                    onDelete={deleteItem}
                    onOpenDetail={id => setSelectedItemId(id)}
                  />
                )
              )}

              {/* Board view */}
              {view === 'board' && (
                <ChecklistBoardView
                  items={tabItems}
                  sensors={sensors}
                  onDragEnd={handleBoardDragEnd}
                  onOpenDetail={id => setSelectedItemId(id)}
                />
              )}
            </TabsContent>
          )
        })}
      </Tabs>

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
