# Task Calendar + UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a calendar view toggle to the tasks page (shows tasks with due dates on a monthly/weekly/agenda calendar with click-to-open side panel), plus keyboard shortcuts, task search/filter, and drag-and-drop reorder on the task tree.

**Architecture:** Calendar view is a new `TaskCalendar` Client Component rendered alongside `TaskTree` inside the existing `TaskTree.tsx` wrapper — both share the same `tasks` state and `selectedTaskId`/`onUpdate`/`onCreated` callbacks. A `view: 'tree' | 'calendar'` toggle in `TaskTree` switches between them. UX improvements (keyboard shortcuts, search) are added directly to `TaskTree`. Drag-and-drop reorder wires up the existing `reorderTasksAction` with `@dnd-kit/sortable`.

**Tech Stack:** Next.js 14 App Router, `react-big-calendar` + `date-fns` localizer, `@dnd-kit/sortable` (already installed), Tailwind CSS, TypeScript

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `components/events/TaskTree.tsx` | Add view toggle, keyboard shortcut (N), search input, pass handlers to calendar |
| Create | `components/events/TaskCalendar.tsx` | Calendar view using react-big-calendar, maps tasks to events, opens TaskSidePanel on click |
| Modify | `components/events/TaskTreeNode.tsx` | Wrap root-level nodes in DndContext/SortableContext for drag-and-drop reorder |

---

### Task 1: Install react-big-calendar and its types

**Files:**
- No code changes — package install only

- [ ] **Step 1: Install packages**

```bash
npm install react-big-calendar
npm install --save-dev @types/react-big-calendar
```

- [ ] **Step 2: Verify install**

```bash
node -e "require('react-big-calendar'); console.log('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install react-big-calendar"
```

---

### Task 2: TaskCalendar component

**Files:**
- Create: `components/events/TaskCalendar.tsx`

- [ ] **Step 1: Create `components/events/TaskCalendar.tsx`**

```tsx
'use client'

import { useMemo } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { pt } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import type { EventTask } from '@/types/app'
import type { ChecklistItemStatus } from '@/types/app'

const locales = { pt }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

const STATUS_BG: Record<ChecklistItemStatus, string> = {
  pending: '#f59e0b',
  in_progress: '#3b82f6',
  completed: '#22c55e',
  skipped: '#94a3b8',
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: EventTask
}

interface OrgMember { id: string; full_name: string }

interface TaskCalendarProps {
  tasks: EventTask[]
  onSelectTask: (taskId: string) => void
}

export default function TaskCalendar({ tasks, onSelectTask }: TaskCalendarProps) {
  const events: CalendarEvent[] = useMemo(() =>
    tasks
      .filter(t => !!t.due_at)
      .map(t => ({
        id: t.id,
        title: t.title,
        start: new Date(t.due_at!),
        end: new Date(t.due_at!),
        resource: t,
      })),
    [tasks]
  )

  function eventStyleGetter(event: CalendarEvent) {
    const bg = STATUS_BG[event.resource.status] ?? '#94a3b8'
    return {
      style: {
        backgroundColor: bg,
        borderColor: bg,
        color: '#fff',
        borderRadius: '4px',
        fontSize: '11px',
        padding: '1px 4px',
      },
    }
  }

  return (
    <div className="h-[600px]">
      <style>{`
        .rbc-calendar { font-family: inherit; }
        .rbc-header { font-size: 12px; font-weight: 600; color: #64748b; padding: 6px 0; }
        .rbc-today { background-color: #eef2ff; }
        .rbc-off-range-bg { background-color: #f8fafc; }
        .rbc-event { border: none !important; }
        .rbc-event:focus { outline: 2px solid #6366f1; }
        .rbc-toolbar button { font-size: 13px; color: #475569; border-color: #e2e8f0; border-radius: 6px; }
        .rbc-toolbar button.rbc-active { background-color: #0f172a; color: #fff; border-color: #0f172a; }
        .rbc-toolbar button:hover { background-color: #f1f5f9; color: #0f172a; }
        .rbc-toolbar-label { font-size: 15px; font-weight: 600; color: #1e293b; }
      `}</style>
      <Calendar
        localizer={localizer}
        events={events}
        defaultView={Views.MONTH}
        views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={(event: CalendarEvent) => onSelectTask(event.id)}
        messages={{
          month: 'Mês',
          week: 'Semana',
          agenda: 'Agenda',
          today: 'Hoje',
          previous: '‹',
          next: '›',
          noEventsInRange: 'Sem tarefas neste período.',
          date: 'Data',
          time: 'Hora',
          event: 'Tarefa',
        }}
        culture="pt"
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors (TaskCalendar not imported anywhere yet, so no cascading errors).

- [ ] **Step 3: Commit**

```bash
git add components/events/TaskCalendar.tsx
git commit -m "feat: TaskCalendar component with react-big-calendar"
```

---

### Task 3: Wire calendar view toggle into TaskTree

**Files:**
- Modify: `components/events/TaskTree.tsx`

- [ ] **Step 1: Read current TaskTree**

Read `components/events/TaskTree.tsx` in full to understand current imports and state.

- [ ] **Step 2: Replace `components/events/TaskTree.tsx`**

Replace the entire file with:

```tsx
'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { Plus, List, CalendarDays, Search, X } from 'lucide-react'
import { createTaskAction } from '@/app/dashboard/events/[eventId]/tasks/actions'
import type { EventTask, EventTaskNode } from '@/types/app'
import TaskTreeNode from './TaskTreeNode'
import TaskSidePanel from './TaskSidePanel'
import TaskCalendar from './TaskCalendar'

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
  const newRootInputRef = useRef<HTMLInputElement>(null)

  const tree = buildTree(tasks)

  // Keyboard shortcut: N = new root task (only when not in input/textarea)
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

  // Search filtering: filter flat list, then rebuild tree from filtered set
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

            {/* New task button (tree view only) */}
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
                  />
                ))}
              </div>
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
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/events/TaskTree.tsx
git commit -m "feat: add calendar view toggle, search, and N shortcut to TaskTree"
```

---

### Task 4: Drag-and-drop reorder on root-level tasks

**Files:**
- Modify: `components/events/TaskTree.tsx` (add DndContext + reorder handler)
- Modify: `components/events/TaskTreeNode.tsx` (make root nodes sortable)

Root-level drag-and-drop only (same parent = null). This wires up the existing `reorderTasksAction`.

- [ ] **Step 1: Read current TaskTreeNode**

Read `components/events/TaskTreeNode.tsx` to understand current structure.

- [ ] **Step 2: Update `components/events/TaskTree.tsx` — add DnD context**

After the existing imports, add:
```tsx
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
```

Inside the `TaskTree` function, add after the existing state declarations:
```tsx
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

  // Optimistic update
  setTasks(prev => prev.map(t => {
    const updated = updatedPositions.find(u => u.id === t.id)
    return updated ?? t
  }))

  startTransition(async () => {
    await reorderTasksAction(eventId, null, reordered.map(t => t.id))
  })
}
```

Replace the tree rendering section (the `<div className="space-y-0.5">` block) inside the tree view with:
```tsx
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
```

- [ ] **Step 3: Update `components/events/TaskTreeNode.tsx` — make root nodes sortable**

Read the file. Add to imports:
```tsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
```

Add `sortable?: boolean` to `TaskTreeNodeProps` interface.

Inside the component, add after existing state declarations:
```tsx
const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
  id: node.id,
  disabled: !sortable || depth > 0,
})

const style = sortable && depth === 0 ? {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1,
} : undefined
```

Wrap the outer `<div>` (the one that wraps the row + children) with:
```tsx
<div ref={sortable && depth === 0 ? setNodeRef : undefined} style={style}>
```

Add drag handle inside the row, before the expand chevron (only shown when `sortable && depth === 0`):
```tsx
{sortable && depth === 0 && (
  <button
    {...attributes}
    {...listeners}
    className="shrink-0 w-4 h-4 flex items-center justify-center text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
    onClick={e => e.stopPropagation()}
    aria-label="Reordenar"
  >
    <GripVertical className="w-3.5 h-3.5" />
  </button>
)}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/events/TaskTree.tsx components/events/TaskTreeNode.tsx
git commit -m "feat: drag-and-drop reorder for root-level tasks"
```

---

### Task 5: Push to GitHub

**Files:** No code changes.

- [ ] **Step 1: Final TypeScript check**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 2: Push**

```bash
git push
```

---

## Self-Review

**Spec coverage:**
- [x] Calendar view toggle (tree/calendar) — Task 3
- [x] react-big-calendar with date-fns localizer — Task 2
- [x] Tasks with due_at shown as events — Task 2
- [x] Color by status (amber/blue/green/slate) — Task 2
- [x] Click task opens TaskSidePanel — Task 3 (onSelectTask → setSelectedTaskId)
- [x] Month/week/agenda views — Task 2 (Views.MONTH default, all three in views array)
- [x] Portuguese labels — Task 2 (messages prop)
- [x] Keyboard shortcut N for new root task — Task 3
- [x] Search/filter tasks by title — Task 3
- [x] Drag-and-drop root reorder — Task 4
- [x] Existing reorderTasksAction wired up — Task 4

**Placeholder scan:** None.

**Type consistency:**
- `TaskCalendarProps.onSelectTask: (taskId: string) => void` matches `setSelectedTaskId` signature in TaskTree.
- `TaskTreeNode` receives new optional prop `sortable?: boolean` — existing call sites pass nothing (defaults to undefined/false), so no breaking change.
- `reorderTasksAction(eventId, null, ids)` matches the existing signature `(eventId: string, parentId: string | null, orderedIds: string[])`.
