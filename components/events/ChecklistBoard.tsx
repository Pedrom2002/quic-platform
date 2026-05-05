'use client'

import { useState } from 'react'
import { calcProgress } from '@/lib/event-status'
import { CheckCircle2, Circle, SkipForward, Plus, Eye, EyeOff, Loader2, Pencil, Trash2, X, Check, Mail, Globe, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import type { EventChecklistItem } from '@/types/database'
import type { NotificationRule } from '@/types/app'
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

type ItemWithMember = EventChecklistItem & {
  assigned_member?: { id: string; full_name: string; avatar_url: string | null } | null
}

interface ChecklistBoardProps {
  eventId: string
  initialItems: ItemWithMember[]
}

export function ChecklistBoard({ eventId, initialItems }: ChecklistBoardProps) {
  const [items, setItems] = useState(initialItems)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newItemTitle, setNewItemTitle] = useState('')
  const [addingItem, setAddingItem] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

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

  async function addItem() {
    if (!newItemTitle.trim()) return
    setAddingItem(true)
    try {
      const maxPos = items.reduce((max, i) => Math.max(max, i.position), 0)
      const res = await fetch(`/api/events/${eventId}/checklist-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newItemTitle.trim(), position: maxPos + 10 }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const { item } = await res.json()
      setItems(prev => [...prev, item])
      setNewItemTitle('')
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

      {/* Items */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 mb-4">
            {items.map(item =>
              editingId === item.id ? (
                <EditRow
                  key={item.id}
                  item={item}
                  onSave={edits => saveEdit(item.id, edits)}
                  onCancel={() => setEditingId(null)}
                  isLoading={loadingId === item.id}
                />
              ) : (
                <SortableChecklistItem
                  key={item.id}
                  item={item}
                  isLoading={loadingId === item.id}
                  isSelected={selected.has(item.id)}
                  onToggleSelect={() => toggleSelect(item.id)}
                  onComplete={() => updateStatus(item.id, 'completed')}
                  onStart={() => updateStatus(item.id, 'in_progress')}
                  onSkip={() => updateStatus(item.id, 'skipped')}
                  onReset={() => updateStatus(item.id, 'pending')}
                  onEdit={() => setEditingId(item.id)}
                  onDelete={() => deleteItem(item.id)}
                />
              )
            )}
            {!items.length && (
              <p className="text-slate-400 text-sm text-center py-8">Nenhuma etapa adicionada ainda.</p>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add item */}
      <div className="flex gap-2">
        <Input
          value={newItemTitle}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItemTitle(e.target.value)}
          placeholder="Adicionar nova etapa..."
          className="bg-white border-slate-200"
          onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && addItem()}
        />
        <Button onClick={addItem} disabled={addingItem || !newItemTitle.trim()} variant="outline">
          {addingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}

// ─── Edit Row ────────────────────────────────────────────────────────────────

interface EditRowProps {
  item: ItemWithMember
  onSave: (edits: Partial<ItemWithMember>) => void
  onCancel: () => void
  isLoading: boolean
}

function EditRow({ item, onSave, onCancel, isLoading }: EditRowProps) {
  const rules = (item.notification_rules as unknown as NotificationRule[]) ?? []
  const existingChannels: string[] = rules[0]?.channels ?? []

  const [title, setTitle] = useState(item.title)
  const [clientLabel, setClientLabel] = useState(item.client_label ?? '')
  const [visible, setVisible] = useState(item.is_client_visible ?? true)
  const [notifyEmail, setNotifyEmail] = useState(existingChannels.includes('email'))
  const [notifyPortal, setNotifyPortal] = useState(existingChannels.includes('portal'))

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
      is_client_visible: visible,
      notification_rules: notificationRules as any,
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
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setVisible(v => !v)}
          className={cn('flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-colors',
            visible ? 'border-slate-300 bg-white text-slate-700' : 'border-slate-200 bg-slate-100 text-slate-400')}>
          {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          Visível cliente
        </button>
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

// ─── Sortable Checklist Item ──────────────────────────────────────────────────

interface ChecklistItemProps {
  item: ItemWithMember
  isLoading: boolean
  isSelected: boolean
  onToggleSelect: () => void
  onComplete: () => void
  onStart: () => void
  onSkip: () => void
  onReset: () => void
  onEdit: () => void
  onDelete: () => void
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

function ChecklistItem({ item, isLoading, isSelected, onToggleSelect, onComplete, onStart, onSkip, onReset, onEdit, onDelete, dragHandleProps }: ChecklistItemProps) {
  const isCompleted = item.status === 'completed'
  const isSkipped = item.status === 'skipped'
  const isInProgress = item.status === 'in_progress'
  const isPending = item.status === 'pending'
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      ref={dragHandleProps.ref}
      style={dragHandleProps.style}
      className={cn(
        'flex items-center gap-3 p-4 rounded-xl border transition-all group',
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
      <button onClick={isCompleted || isSkipped ? onReset : onComplete} disabled={isLoading} className="shrink-0">
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
      <div className="flex items-center gap-1 shrink-0">
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
          <Button size="sm" variant="ghost" onClick={onEdit} disabled={isLoading}
            className="h-7 w-7 p-0 text-slate-300 hover:text-slate-700">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} disabled={isLoading}
            className="h-7 w-7 p-0 text-slate-300 hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
