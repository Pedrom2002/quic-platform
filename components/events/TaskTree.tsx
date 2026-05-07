'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { createTaskAction } from '@/app/dashboard/events/[eventId]/tasks/actions'
import type { EventTask, EventTaskNode } from '@/types/app'
import TaskTreeNode from './TaskTreeNode'
import TaskSidePanel from './TaskSidePanel'

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
  const [, startTransition] = useTransition()

  const tree = buildTree(tasks)

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

  return (
    <div className="flex gap-6">
      {/* Tree panel */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700">Tarefas internas</h2>
          <button
            onClick={() => setAddingRoot(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nova tarefa
          </button>
        </div>

        {addingRoot && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 border border-slate-200 rounded-lg bg-white">
            <input
              autoFocus
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

        {tree.length === 0 && !addingRoot ? (
          <p className="text-sm text-slate-400 text-center py-12">Sem tarefas ainda. Cria a primeira tarefa.</p>
        ) : (
          <div className="space-y-0.5">
            {tree.map(node => (
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
              />
            ))}
          </div>
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
    </div>
  )
}
