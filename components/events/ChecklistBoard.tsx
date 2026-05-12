'use client'

import { useState, useEffect } from 'react'
import { calcProgress } from '@/lib/event-status'
import { CheckCircle2, Circle, SkipForward, Plus, EyeOff, Loader2, Trash2, X, Check, Mail, Globe, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format, differenceInCalendarDays, isToday, isPast } from 'date-fns'
import { pt } from 'date-fns/locale'
import type { NotificationRule, ItemWithMemberAndCounts, ChecklistItemStatus } from '@/types/app'
import { updateChecklistItemAction } from '@/app/dashboard/events/[eventId]/checklist/actions'
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
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type ItemWithMember = ItemWithMemberAndCounts

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
    import('@/app/dashboard/events/[eventId]/checklist/actions')
      .then(({ loadOrgTeamMembersAction }) => loadOrgTeamMembersAction(eventId))
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
    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered)

    try {
      const { reorderChecklistItemsAction } = await import(
        '@/app/dashboard/events/[eventId]/checklist/actions'
      )
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
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
  }

  async function bulkUpdate(status: 'completed' | 'in_progress' | 'skipped') {
    if (!selected.size) return
    setBulkLoading(true)
    const count = selected.size
    try {
      const { bulkUpdateChecklistStatusAction } = await import(
        '@/app/dashboard/events/[eventId]/checklist/actions'
      )
      await bulkUpdateChecklistStatusAction(eventId, Array.from(selected), status)
      setItems(prev => prev.map(i =>
        selected.has(i.id)
          ? { ...i, status, completed_at: status === 'completed' ? new Date().toISOString() : null }
          : i
      ))
      clearSelection()
      toast.success(`${count} etapa${count !== 1 ? 's' : ''} atualizadas`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setBulkLoading(false)
    }
  }

  const total = items.length
  const completed = items.filter(i => i.status === 'completed').length
  const percent = calcProgress(completed, total)

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

  async function saveEdit(itemId: string, edits: Partial<ItemWithMember>) {
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

  async function addItem(fields: {
    title: string; clientLabel: string
    assignedTo: string; notifyEmail: boolean; notifyPortal: boolean
  }) {
    setAddingItem(true)
    try {
      const maxPos = items.reduce((max, i) => Math.max(max, i.position), 0)
      const channels: string[] = []
      if (fields.notifyEmail) channels.push('email')
      if (fields.notifyPortal) channels.push('portal')
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

      // Apply notification rules via PATCH if needed
      if (channels.length > 0) {
        await fetch(`/api/events/${eventId}/checklist-items/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notification_rules: [{ trigger: 'on_complete', delay_minutes: 0, audience: 'all_clients', channels }],
          }),
        })
        item.notification_rules = [{ trigger: 'on_complete', delay_minutes: 0, audience: 'all_clients', channels }] as any
      }

      setItems(prev => [...prev, item])
      setShowNewForm(false)
      toast.success('Etapa adicionada')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setAddingItem(false)
    }
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
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Lista
          </button>
          <button
            onClick={() => setView('board')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === 'board' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Board
          </button>
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
            onClick={clearSelection}>
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleBoardDragEnd}
        >
          <div className="grid grid-cols-4 gap-4 mb-4">
            {(['pending', 'in_progress', 'completed', 'skipped'] as ChecklistItemStatus[]).map(col => {
              const colItems = items.filter(i => i.status === col)
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
                        <KanbanCard
                          key={item.id}
                          item={item}
                          onClick={() => setSelectedItemId(item.id)}
                        />
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
            onUpdate={updated => {
              setItems(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i))
            }}
          />
        )
      })()}
    </div>
  )
}

// ─── Edit Row ────────────────────────────────────────────────────────────────

interface EditRowProps {
  item: ItemWithMember
  orgMembers: { id: string; full_name: string }[]
  onSave: (edits: Partial<ItemWithMember>) => void
  onCancel: () => void
  isLoading: boolean
}

function EditRow({ item, orgMembers, onSave, onCancel, isLoading }: EditRowProps) {
  const rules = (item.notification_rules as unknown as NotificationRule[]) ?? []
  const existingChannels: string[] = rules[0]?.channels ?? []

  const [title, setTitle] = useState(item.title)
  const [clientLabel, setClientLabel] = useState(item.client_label ?? '')
  const [notifyEmail, setNotifyEmail] = useState(existingChannels.includes('email'))
  const [notifyPortal, setNotifyPortal] = useState(existingChannels.includes('portal'))
  const [assignedTo, setAssignedTo] = useState<string>(item.assigned_to ?? '')

  function handleSave() {
    const channels: string[] = []
    if (notifyEmail) channels.push('email')
    if (notifyPortal) channels.push('portal')
    const notificationRules = channels.length > 0
      ? [{ trigger: 'on_complete', delay_minutes: 0, audience: 'all_clients', channels }]
      : []
    onSave({
      title,
      client_label: clientLabel || title,
      is_client_visible: true,
      notification_rules: notificationRules as any,
      assigned_to: assignedTo || null,
    })
  }

  return (
    <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-3">
      <div className="space-y-2">
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Título interno"
          className="bg-white border-slate-200 text-sm"
        />
        <Input
          value={clientLabel}
          onChange={e => setClientLabel(e.target.value)}
          placeholder="Label visível pelo cliente (ex: Palco montado)"
          className="bg-white border-slate-200 text-xs text-slate-600"
        />
        {orgMembers.length > 0 && (
          <select
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">— Sem atribuição —</option>
            {orgMembers.map(m => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setNotifyEmail(v => !v)}
          className={cn('flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-colors',
            notifyEmail ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-400')}>
          <Mail className="w-3 h-3" />Email
        </button>
        <button type="button" onClick={() => setNotifyPortal(v => !v)}
          className={cn('flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-colors',
            notifyPortal ? 'border-violet-200 bg-violet-50 text-violet-600' : 'border-slate-200 bg-white text-slate-400')}>
          <Globe className="w-3 h-3" />Portal
        </button>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={isLoading} className="h-7 px-2 text-slate-400">
          <X className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isLoading || !title.trim()} className="h-7 px-3 text-xs">
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" />Guardar</>}
        </Button>
      </div>
    </div>
  )
}

// ─── New Item Row ─────────────────────────────────────────────────────────────

interface NewItemRowProps {
  orgMembers: { id: string; full_name: string }[]
  isLoading: boolean
  onSave: (fields: { title: string; clientLabel: string; assignedTo: string; notifyEmail: boolean; notifyPortal: boolean }) => void
  onCancel: () => void
}

function NewItemRow({ orgMembers, isLoading, onSave, onCancel }: NewItemRowProps) {
  const [title, setTitle] = useState('')
  const [clientLabel, setClientLabel] = useState('')
  const [notifyEmail, setNotifyEmail] = useState(false)
  const [notifyPortal, setNotifyPortal] = useState(false)
  const [assignedTo, setAssignedTo] = useState('')

  return (
    <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-3">
      <div className="space-y-2">
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Título interno"
          className="bg-white border-slate-200 text-sm"
          autoFocus
          onKeyDown={e => e.key === 'Escape' && onCancel()}
        />
        <Input
          value={clientLabel}
          onChange={e => setClientLabel(e.target.value)}
          placeholder="Label visível pelo cliente (ex: Palco montado)"
          className="bg-white border-slate-200 text-xs text-slate-600"
        />
        {orgMembers.length > 0 && (
          <select
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">— Sem atribuição —</option>
            {orgMembers.map(m => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setNotifyEmail(v => !v)}
          className={cn('flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-colors',
            notifyEmail ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-400')}>
          <Mail className="w-3 h-3" />Email
        </button>
        <button type="button" onClick={() => setNotifyPortal(v => !v)}
          className={cn('flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-colors',
            notifyPortal ? 'border-violet-200 bg-violet-50 text-violet-600' : 'border-slate-200 bg-white text-slate-400')}>
          <Globe className="w-3 h-3" />Portal
        </button>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={isLoading} className="h-7 px-2 text-slate-400">
          <X className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" onClick={() => onSave({ title, clientLabel, assignedTo, notifyEmail, notifyPortal })} disabled={isLoading || !title.trim()} className="h-7 px-3 text-xs">
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" />Guardar</>}
        </Button>
      </div>
    </div>
  )
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function KanbanCard({ item, onClick }: { item: ItemWithMemberAndCounts; onClick: () => void }) {
  const isOverdue = !!(item.due_at && item.status !== 'completed' && item.status !== 'skipped'
    && isPast(new Date(item.due_at)) && !isToday(new Date(item.due_at)))
  const daysOverdue = isOverdue && item.due_at
    ? Math.abs(differenceInCalendarDays(new Date(item.due_at), new Date()))
    : 0

  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-lg p-3 mb-2 cursor-pointer hover:shadow-sm hover:border-slate-300 transition-all"
    >
      <p className="text-sm font-medium text-slate-800 line-clamp-2 mb-2">{item.title}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {item.assigned_member && (
          <span className="w-5 h-5 rounded-full bg-slate-100 text-[9px] font-semibold text-slate-600 flex items-center justify-center shrink-0">
            {item.assigned_member.full_name.split(' ').filter(Boolean).slice(0,2).map(n => n[0].toUpperCase()).join('')}
          </span>
        )}
        {item.due_at && (
          <span className={`text-[10px] font-medium ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
            {isOverdue ? `${daysOverdue}d atraso` : format(new Date(item.due_at), "d MMM", { locale: pt })}
          </span>
        )}
        {item.note_count > 0 && (
          <span className="text-[10px] text-slate-400 ml-auto">{item.note_count} nota{item.note_count !== 1 ? 's' : ''}</span>
        )}
        {item.file_count > 0 && (
          <span className="text-[10px] text-slate-400">{item.file_count} fich.</span>
        )}
      </div>
    </div>
  )
}

// ─── Sortable Checklist Item ──────────────────────────────────────────────────

interface ChecklistItemProps {
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
    listeners: Record<string, Function> | undefined
    attributes: import('@dnd-kit/core').DraggableAttributes
  }
}

function SortableChecklistItem(props: Omit<ChecklistItemProps, 'dragHandleProps'>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.item.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <ChecklistItem
      {...props}
      dragHandleProps={{
        ref: setNodeRef,
        style,
        isDragging,
        listeners,
        attributes,
      }}
    />
  )
}

// ─── Checklist Item ───────────────────────────────────────────────────────────

function ChecklistItem({ item, orgMembers, isLoading, isSelected, onToggleSelect, onComplete, onStart, onSkip, onReset, onEdit, onDelete, onOpenDetail, dragHandleProps }: ChecklistItemProps) {
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
      {/* Drag handle */}
      <button
        {...(dragHandleProps.listeners ?? {})}
        {...dragHandleProps.attributes}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 touch-none"
        onClick={e => e.stopPropagation()}
        aria-label="Reordenar"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        className="w-4 h-4 rounded border-slate-300 text-slate-700 cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 transition-opacity checked:opacity-100"
        onClick={e => e.stopPropagation()}
      />

      {/* Status icon */}
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

      {/* Content */}
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
              <span
                title={member.full_name}
                className="w-5 h-5 rounded-full bg-slate-100 text-[9px] font-semibold text-slate-600 flex items-center justify-center shrink-0"
              >
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

      {/* Actions */}
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
