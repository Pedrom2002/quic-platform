'use client'

import { useState, useEffect, useTransition } from 'react'
import { format } from 'date-fns'
import { X, Plus } from 'lucide-react'
import {
  updateTaskAction,
  loadTaskNotesAction,
  loadTaskFilesAction,
  createTaskAction,
} from '@/app/dashboard/events/[eventId]/tasks/actions'
import type { EventTask, EventTaskNote, EventTaskFileLink, ChecklistItemStatus } from '@/types/app'
import { calcProgress, buildTree } from './TaskTree'
import TaskSidePanelForm from './TaskSidePanelForm'
import TaskSidePanelNotes from './TaskSidePanelNotes'
import TaskSidePanelFiles from './TaskSidePanelFiles'

interface OrgMember { id: string; full_name: string }

interface TaskSidePanelProps {
  eventId: string
  task: EventTask
  allTasks: EventTask[]
  orgMembers: OrgMember[]
  currentMemberId: string | null
  checklistItems: { id: string; title: string; client_label: string | null; status: string }[]
  onClose: () => void
  onUpdate: (updated: Partial<EventTask> & { id: string }) => void
  onCreated: (task: EventTask) => void
}

export default function TaskSidePanel({
  eventId, task, allTasks, orgMembers, currentMemberId, checklistItems,
  onClose, onUpdate, onCreated,
}: TaskSidePanelProps) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [status, setStatus] = useState<ChecklistItemStatus>(task.status)
  const [assignedTo, setAssignedTo] = useState(task.assigned_to ?? '')
  const [dueAt, setDueAt] = useState(task.due_at ? format(new Date(task.due_at), "yyyy-MM-dd'T'HH:mm") : '')
  const [checklistItemId, setChecklistItemId] = useState(task.checklist_item_id ?? '')

  const [notes, setNotes] = useState<EventTaskNote[] | null>(null)
  const [fileLinks, setFileLinks] = useState<EventTaskFileLink[] | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)
  const [addingSubTask, setAddingSubTask] = useState(false)
  const [subTaskTitle, setSubTaskTitle] = useState('')
  const [, startTransition] = useTransition()

  useEffect(() => {
    loadTaskNotesAction(eventId, task.id).then(setNotes)
    loadTaskFilesAction(eventId, task.id).then(setFileLinks)
  }, [eventId, task.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description ?? '')
    setStatus(task.status)
    setAssignedTo(task.assigned_to ?? '')
    setDueAt(task.due_at ? format(new Date(task.due_at), "yyyy-MM-dd'T'HH:mm") : '')
    setChecklistItemId(task.checklist_item_id ?? '')
    setNotes(null)
    setFileLinks(null)
    loadTaskNotesAction(eventId, task.id).then(setNotes)
    loadTaskFilesAction(eventId, task.id).then(setFileLinks)
  }, [task.id, eventId, task.title, task.description, task.status, task.assigned_to, task.due_at, task.checklist_item_id])

  function saveField(fields: Parameters<typeof updateTaskAction>[2]) {
    startTransition(async () => {
      const updated = await updateTaskAction(eventId, task.id, fields)
      if (updated) onUpdate({ id: task.id, ...fields })
    })
  }

  const tree = buildTree(allTasks)
  function findNode(nodes: ReturnType<typeof buildTree>, id: string): ReturnType<typeof buildTree>[0] | null {
    for (const n of nodes) {
      if (n.id === id) return n
      const found = findNode(n.children, id)
      if (found) return found
    }
    return null
  }
  const taskNode = findNode(tree, task.id)
  const progress = taskNode && taskNode.children.length > 0 ? calcProgress(taskNode) : null

  const directChildren = allTasks.filter(t => t.parent_id === task.id).sort((a, b) => a.position - b.position)

  function handleAddSubTask() {
    const trimmed = subTaskTitle.trim()
    if (!trimmed) return
    setSubTaskTitle('')
    setAddingSubTask(false)
    startTransition(async () => {
      const created = await createTaskAction(eventId, { title: trimmed, parentId: task.id })
      if (created) onCreated(created)
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== task.title && saveField({ title: title.trim() })}
            className="flex-1 text-base font-semibold text-slate-900 focus:outline-none bg-transparent"
            placeholder="Título da tarefa"
          />
          <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          <TaskSidePanelForm
            eventId={eventId}
            task={task}
            orgMembers={orgMembers}
            checklistItems={checklistItems}
            status={status}
            setStatus={setStatus}
            assignedTo={assignedTo}
            setAssignedTo={setAssignedTo}
            dueAt={dueAt}
            setDueAt={setDueAt}
            checklistItemId={checklistItemId}
            setChecklistItemId={setChecklistItemId}
            description={description}
            setDescription={setDescription}
            saveField={saveField}
            onCreated={onCreated}
          />

          {/* Progress */}
          {progress && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Progresso</span>
                <span className="text-xs text-slate-500">{progress.completed}/{progress.total}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0}%` }} />
              </div>
            </div>
          )}

          {/* Direct sub-tasks */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Sub-tarefas diretas</span>
              <span className="text-xs text-slate-400">{directChildren.length}</span>
              <button onClick={() => setAddingSubTask(true)} className="ml-auto text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors">
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>
            {addingSubTask && (
              <div className="flex items-center gap-2 mb-2 border border-slate-200 rounded-lg px-3 py-1.5">
                <input autoFocus type="text" value={subTaskTitle} onChange={e => setSubTaskTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddSubTask(); if (e.key === 'Escape') { setAddingSubTask(false); setSubTaskTitle('') } }}
                  placeholder="Título..." className="flex-1 text-sm focus:outline-none" />
                <button onClick={handleAddSubTask} className="text-xs font-medium px-2 py-0.5 bg-slate-900 text-white rounded">OK</button>
                <button onClick={() => { setAddingSubTask(false); setSubTaskTitle('') }} className="text-xs text-slate-400 hover:text-slate-700">✕</button>
              </div>
            )}
            {directChildren.length > 0 && (
              <div className="space-y-1">
                {directChildren.map(child => (
                  <div key={child.id} className="flex items-center gap-2 text-sm text-slate-600 py-1 px-2 rounded hover:bg-slate-50">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${child.status === 'completed' ? 'bg-green-400' : child.status === 'in_progress' ? 'bg-blue-400' : 'bg-amber-300'}`} />
                    <span className={child.status === 'completed' ? 'line-through text-slate-400' : ''}>{child.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100" />

          <TaskSidePanelNotes
            eventId={eventId}
            taskId={task.id}
            currentMemberId={currentMemberId}
            notes={notes}
            setNotes={setNotes}
            noteContent={noteContent}
            setNoteContent={setNoteContent}
            deletingNoteId={deletingNoteId}
            setDeletingNoteId={setDeletingNoteId}
          />

          <div className="border-t border-slate-100" />

          <TaskSidePanelFiles
            eventId={eventId}
            taskId={task.id}
            fileLinks={fileLinks}
            setFileLinks={setFileLinks}
          />
        </div>
      </div>
    </>
  )
}
