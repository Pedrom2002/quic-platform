'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { Plus, List, CalendarDays, Search, X, Sparkles } from 'lucide-react'
import { createTaskAction } from '@/app/dashboard/events/[eventId]/tasks/actions'
import type { EventTask, EventTaskNode } from '@/types/app'
import TaskTreeNode from './TaskTreeNode'
import TaskSidePanel from './TaskSidePanel'
import TaskCalendar from './TaskCalendar'
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
import { reorderTasksAction } from '@/app/dashboard/events/[eventId]/tasks/actions'
import dynamic from 'next/dynamic'
const GenerateTasksModal = dynamic(() => import('./GenerateTasksModal'), { ssr: false })

export function buildTree(flat: EventTask[]): EventTaskNode[] {
  const map = new Map<string, EventTaskNode>()
  const roots: EventTaskNode[] = []
  for (const t of [...flat].sort((a, b) => a.position - b.position)) {
    map.set(t.id, { ...t, children: [] })
  }
  for (const t of flat) {
    const node = map.get(t.id)!
    if (t.parent_id && map.has(t.parent_id)) {
      map.get(t.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

export function calcProgress(node: EventTaskNode): { total: number; completed: number } {
  if (!node.children.length) {
    return { total: 1, completed: node.status === 'completed' ? 1 : 0 }
  }
  return node.children.reduce(
    (acc, child) => {
      const p = calcProgress(child)
      return { total: acc.total + p.total, completed: acc.completed + p.completed }
    },
    { total: 0, completed: 0 }
  )
}

interface OrgMember { id: string; full_name: string }

interface TaskTreeProps {
  eventId: string
  initialTasks: EventTask[]
  orgMembers: OrgMember[]
  currentMemberId: string | null
  checklistItems: { id: string; title: string; client_label: string | null; status: string }[]
}

export function TaskTree({ eventId, initialTasks, orgMembers, currentMemberId, checklistItems }: TaskTreeProps) {
  const [tasks, setTasks] = useState<EventTask[]>(initialTasks)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [addingRoot, setAddingRoot] = useState(false)
  const [newRootTitle, setNewRootTitle] = useState('')
  const [view, setView] = useState<'tree' | 'calendar'>('tree')
  const [search, setSearch] = useState('')
  const [, startTransition] = useTransition()
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const newRootInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const rootTasks = tasks.filter(t => t.parent_id === null).sort((a, b) => a.position - b.position)
    const oldIndex = rootTasks.findIndex(t => t.id === active.id)
    const newIndex = rootTasks.findIndex(t => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(rootTasks, oldIndex, newIndex)
    const updatedPositions = reordered.map((t, i) => ({ ...t, position: i }))

    setTasks(prev => prev.map(t => {
      const updated = updatedPositions.find(u => u.id === t.id)
      return updated ?? t
    }))

    startTransition(async () => {
      await reorderTasksAction(eventId, null, reordered.map(t => t.id))
    })
  }

  const tree = buildTree(tasks)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setAddingRoot(true)
        setView('tree')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (addingRoot) newRootInputRef.current?.focus()
  }, [addingRoot])

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleTaskUpdate(updated: Partial<EventTask> & { id: string }) {
    setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
  }

  function handleTaskDelete(taskId: string) {
    const toRemove = new Set<string>()
    function collect(id: string) {
      toRemove.add(id)
      tasks.filter(t => t.parent_id === id).forEach(t => collect(t.id))
    }
    collect(taskId)
    setTasks(prev => prev.filter(t => !toRemove.has(t.id)))
    if (selectedTaskId && toRemove.has(selectedTaskId)) setSelectedTaskId(null)
  }

  function handleTaskCreated(task: EventTask) {
    setTasks(prev => [...prev, task])
    if (task.parent_id) {
      setExpandedIds(prev => new Set([...prev, task.parent_id!]))
    }
  }

  function handleAddRootTask() {
    const trimmed = newRootTitle.trim()
    if (!trimmed) return
    setNewRootTitle('')
    setAddingRoot(false)
    startTransition(async () => {
      const task = await createTaskAction(eventId, { title: trimmed })
      if (task) handleTaskCreated(task)
    })
  }

  const selectedTask = tasks.find(t => t.id === selectedTaskId) ?? null

  const filteredTasks = search.trim()
    ? tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : tasks

  const filteredTree = buildTree(filteredTasks)

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-slate-700 shrink-0">Tarefas internas</h2>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar tarefas..."
              className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setView('tree')}
                className={`p-1.5 transition-colors ${view === 'tree' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
                aria-label="Vista em árvore"
                title="Árvore"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`p-1.5 transition-colors ${view === 'calendar' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
                aria-label="Vista em calendário"
                title="Calendário"
              >
                <CalendarDays className="w-3.5 h-3.5" />
              </button>
            </div>

            {view === 'tree' && (
              <button
                onClick={() => setShowGenerateModal(true)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                title="Gerar tarefas com IA"
              >
                <Sparkles className="w-3.5 h-3.5" /> Gerar com IA
              </button>
            )}
            {view === 'tree' && (
              <button
                onClick={() => setAddingRoot(true)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
                title="Nova tarefa (N)"
              >
                <Plus className="w-3.5 h-3.5" /> Nova tarefa
              </button>
            )}
          </div>
        </div>

        {/* Tree view */}
        {view === 'tree' && (
          <>
            {addingRoot && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 border border-slate-200 rounded-lg bg-white">
                <input
                  ref={newRootInputRef}
                  type="text"
                  value={newRootTitle}
                  onChange={e => setNewRootTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddRootTask()
                    if (e.key === 'Escape') { setAddingRoot(false); setNewRootTitle('') }
                  }}
                  placeholder="Título da tarefa..."
                  className="flex-1 text-sm focus:outline-none"
                />
                <button onClick={handleAddRootTask} className="text-xs font-medium px-2 py-1 bg-slate-900 text-white rounded">OK</button>
                <button onClick={() => { setAddingRoot(false); setNewRootTitle('') }} className="text-xs text-slate-400 hover:text-slate-700">✕</button>
              </div>
            )}

            {filteredTree.length === 0 && !addingRoot ? (
              <p className="text-sm text-slate-400 text-center py-12">
                {search ? 'Sem tarefas encontradas.' : 'Sem tarefas ainda. Cria a primeira tarefa.'}
              </p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={filteredTree.map(n => n.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-0.5">
                    {filteredTree.map(node => (
                      <TaskTreeNode
                        key={node.id}
                        node={node}
                        depth={0}
                        eventId={eventId}
                        orgMembers={orgMembers}
                        expandedIds={expandedIds}
                        selectedTaskId={selectedTaskId}
                        onToggleExpand={toggleExpanded}
                        onSelect={setSelectedTaskId}
                        onUpdate={handleTaskUpdate}
                        onDelete={handleTaskDelete}
                        onCreated={handleTaskCreated}
                        sortable={true}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </>
        )}

        {/* Calendar view */}
        {view === 'calendar' && (
          <TaskCalendar
            tasks={tasks}
            onSelectTask={setSelectedTaskId}
          />
        )}
      </div>

      {/* Side panel */}
      {selectedTask && (
        <TaskSidePanel
          eventId={eventId}
          task={selectedTask}
          allTasks={tasks}
          orgMembers={orgMembers}
          currentMemberId={currentMemberId}
          checklistItems={checklistItems}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={handleTaskUpdate}
          onCreated={handleTaskCreated}
        />
      )}

      {showGenerateModal && (
        <GenerateTasksModal
          eventId={eventId}
          onClose={() => setShowGenerateModal(false)}
          onTasksCreated={(newTasks) => {
            newTasks.forEach(handleTaskCreated)
          }}
        />
      )}
    </div>
  )
}
