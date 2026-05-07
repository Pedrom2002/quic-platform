# Event Tasks — Internal Task Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hierarchical internal task management system per event, completely separate from the client-facing checklist, with tree view, assignees, due dates, notes, files, and progress aggregation.

**Architecture:** New tables `event_tasks`, `event_task_notes`, `event_task_files` (adjacency list via `parent_id`). Single flat query per page load; client builds tree in memory. New pages at `/tasks` under each event. Existing checklist is untouched.

**Tech Stack:** Next.js 14 App Router, Supabase, Tailwind CSS, @dnd-kit (already installed), @vercel/blob (already installed), date-fns, lucide-react

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `supabase/migrations/0007_event_tasks.sql` | 3 new tables + RLS + trigger |
| Modify | `types/app.ts` | EventTask, EventTaskNode, EventTaskNote, EventTaskFileLink |
| Modify | `types/database.ts` | Row/Insert/Update for 3 new tables + type aliases |
| Create | `app/dashboard/events/[eventId]/tasks/actions.ts` | 12 server actions |
| Create | `app/dashboard/events/[eventId]/tasks/page.tsx` | Server Component — fetch + render TaskTree |
| Create | `components/events/TaskTree.tsx` | Client Component — builds tree, manages selection + expansion state |
| Create | `components/events/TaskTreeNode.tsx` | Recursive node renderer — indentation, status, progress, expand/collapse |
| Create | `components/events/TaskSidePanel.tsx` | Slide-over detail panel — title/status/assignee/due/description/progress/notes/files/checklist link |
| Modify | `app/dashboard/events/[eventId]/page.tsx` | Add Tarefas card, grid-cols-5 → grid-cols-6 |

---

### Task 1: DB migration — event_tasks, event_task_notes, event_task_files

**Files:**
- Create: `supabase/migrations/0007_event_tasks.sql`

- [ ] **Step 1: Create the migration file**

Write `supabase/migrations/0007_event_tasks.sql`:

```sql
-- event_tasks
CREATE TABLE event_tasks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id         uuid REFERENCES event_tasks(id) ON DELETE CASCADE,
  checklist_item_id uuid REFERENCES event_checklist_items(id) ON DELETE SET NULL,
  title             text NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 500),
  description       text,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')),
  assigned_to       uuid REFERENCES team_members(id) ON DELETE SET NULL,
  due_at            timestamptz,
  position          integer NOT NULL DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);
CREATE TRIGGER event_tasks_updated_at BEFORE UPDATE ON event_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_et_event      ON event_tasks(event_id);
CREATE INDEX idx_et_org        ON event_tasks(organization_id);
CREATE INDEX idx_et_parent     ON event_tasks(parent_id);
CREATE INDEX idx_et_event_par  ON event_tasks(event_id, parent_id);
ALTER TABLE event_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_select_et" ON event_tasks FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "members_insert_et" ON event_tasks FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_update_et" ON event_tasks FOR UPDATE USING (organization_id = get_user_org_id());
CREATE POLICY "members_delete_et" ON event_tasks FOR DELETE USING (organization_id = get_user_org_id());

-- event_task_notes
CREATE TABLE event_task_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid NOT NULL REFERENCES event_tasks(id) ON DELETE CASCADE,
  event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id       uuid REFERENCES team_members(id) ON DELETE SET NULL,
  content         text NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 10000),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE TRIGGER event_task_notes_updated_at BEFORE UPDATE ON event_task_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_etn_task ON event_task_notes(task_id);
CREATE INDEX idx_etn_org  ON event_task_notes(organization_id);
ALTER TABLE event_task_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_select_etn" ON event_task_notes FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "members_insert_etn" ON event_task_notes FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_delete_etn" ON event_task_notes FOR DELETE USING (
  organization_id = get_user_org_id()
  AND (
    author_id IN (SELECT id FROM team_members WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM team_members WHERE auth_user_id = auth.uid()
               AND organization_id = event_task_notes.organization_id
               AND role IN ('admin','manager'))
  )
);

-- event_task_files
CREATE TABLE event_task_files (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid NOT NULL REFERENCES event_tasks(id) ON DELETE CASCADE,
  event_file_id   uuid NOT NULL REFERENCES event_files(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  linked_by       uuid REFERENCES team_members(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX idx_etf_task ON event_task_files(task_id);
CREATE INDEX idx_etf_org  ON event_task_files(organization_id);
ALTER TABLE event_task_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_select_etf" ON event_task_files FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "members_insert_etf" ON event_task_files FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_delete_etf" ON event_task_files FOR DELETE USING (organization_id = get_user_org_id());
```

- [ ] **Step 2: Push migration**

```bash
npx supabase db push
```
Expected: `Applying migration 0007_event_tasks.sql... Finished supabase db push.`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0007_event_tasks.sql
git commit -m "feat: event tasks, task notes, task files tables"
```

---

### Task 2: Types — app.ts and database.ts

**Files:**
- Modify: `types/app.ts`
- Modify: `types/database.ts`

- [ ] **Step 1: Append to `types/app.ts`**

Add at the end of `types/app.ts`:

```ts
export interface EventTask {
  id: string
  event_id: string
  organization_id: string
  parent_id: string | null
  checklist_item_id: string | null
  title: string
  description: string | null
  status: ChecklistItemStatus
  assigned_to: string | null
  due_at: string | null
  position: number
  created_at: string
  updated_at: string
  assigned_member?: { id: string; full_name: string; avatar_url: string | null } | null
}

export interface EventTaskNode extends EventTask {
  children: EventTaskNode[]
}

export interface EventTaskNote {
  id: string
  task_id: string
  event_id: string
  organization_id: string
  author_id: string | null
  content: string
  created_at: string
  updated_at: string
  author: { id: string; full_name: string; avatar_url: string | null } | null
}

export interface EventTaskFileLink {
  id: string
  task_id: string
  event_file_id: string
  organization_id: string
  linked_by: string | null
  created_at: string
  file: EventFileWithUploader
}
```

- [ ] **Step 2: Add table definitions to `types/database.ts`**

Find the closing `}` of `checklist_item_files` table definition (currently near line 684). Add after it, before the `Views` line:

```ts
      event_tasks: {
        Row: {
          id: string
          event_id: string
          organization_id: string
          parent_id: string | null
          checklist_item_id: string | null
          title: string
          description: string | null
          status: string
          assigned_to: string | null
          due_at: string | null
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          organization_id: string
          parent_id?: string | null
          checklist_item_id?: string | null
          title: string
          description?: string | null
          status?: string
          assigned_to?: string | null
          due_at?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          parent_id?: string | null
          checklist_item_id?: string | null
          title?: string
          description?: string | null
          status?: string
          assigned_to?: string | null
          due_at?: string | null
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      event_task_notes: {
        Row: {
          id: string
          task_id: string
          event_id: string
          organization_id: string
          author_id: string | null
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          event_id: string
          organization_id: string
          author_id?: string | null
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          content?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_task_files: {
        Row: {
          id: string
          task_id: string
          event_file_id: string
          organization_id: string
          linked_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          event_file_id: string
          organization_id: string
          linked_by?: string | null
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
```

Then add type aliases near the existing aliases at the bottom of `types/database.ts`:

```ts
export type EventTask = Database['public']['Tables']['event_tasks']['Row']
export type EventTaskNote = Database['public']['Tables']['event_task_notes']['Row']
export type EventTaskFileRow = Database['public']['Tables']['event_task_files']['Row']
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add types/app.ts types/database.ts
git commit -m "feat: event tasks types"
```

---

### Task 3: Server actions

**Files:**
- Create: `app/dashboard/events/[eventId]/tasks/actions.ts`

- [ ] **Step 1: Create the actions file**

Create `app/dashboard/events/[eventId]/tasks/actions.ts`:

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { resolveOrgMember } from '@/lib/supabase/actions'
import { put } from '@vercel/blob'
import { MAX_FILE_SIZE } from '@/schemas/file.schema'
import type { ChecklistItemStatus, EventTask, EventTaskNote, EventTaskFileLink, EventFileWithUploader } from '@/types/app'

async function assertEventOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  organizationId: string
) {
  const { data } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('organization_id', organizationId)
    .single()
  return !!data
}

export async function loadEventTasksAction(eventId: string): Promise<EventTask[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return []

  const { data } = await supabase
    .from('event_tasks')
    .select('*, assigned_member:team_members!assigned_to(id, full_name, avatar_url)')
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)
    .order('position', { ascending: true })
    .returns<EventTask[]>()

  return data ?? []
}

export async function createTaskAction(
  eventId: string,
  fields: { title: string; parentId?: string | null; checklistItemId?: string | null }
): Promise<EventTask | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return null

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return null

  // Calculate position: max sibling position + 1
  const { data: siblings } = await supabase
    .from('event_tasks')
    .select('position')
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)
    .is(fields.parentId ? 'parent_id' : 'parent_id', fields.parentId ?? null)
    .order('position', { ascending: false })
    .limit(1)

  const position = siblings && siblings.length > 0 ? siblings[0].position + 1 : 0

  const { data } = await supabase
    .from('event_tasks')
    .insert({
      event_id: eventId,
      organization_id: member.organization_id,
      parent_id: fields.parentId ?? null,
      checklist_item_id: fields.checklistItemId ?? null,
      title: fields.title.trim(),
      position,
    })
    .select('*, assigned_member:team_members!assigned_to(id, full_name, avatar_url)')
    .returns<EventTask[]>()
    .single()

  return data ?? null
}

export async function updateTaskAction(
  eventId: string,
  taskId: string,
  fields: {
    title?: string
    description?: string | null
    status?: ChecklistItemStatus
    assigned_to?: string | null
    due_at?: string | null
    checklist_item_id?: string | null
  }
): Promise<EventTask | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return null

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return null

  const updateData: Record<string, unknown> = { ...fields }
  if (fields.status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  } else if (fields.status !== undefined) {
    updateData.completed_at = null
  }

  const { data } = await supabase
    .from('event_tasks')
    .update(updateData)
    .eq('id', taskId)
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)
    .select('*, assigned_member:team_members!assigned_to(id, full_name, avatar_url)')
    .returns<EventTask[]>()
    .single()

  return data ?? null
}

export async function deleteTaskAction(eventId: string, taskId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return false

  const { error, count } = await supabase
    .from('event_tasks')
    .delete({ count: 'exact' })
    .eq('id', taskId)
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)

  return !error && (count ?? 0) > 0
}

export async function reorderTasksAction(
  eventId: string,
  parentId: string | null,
  orderedIds: string[]
): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return false

  const updates = orderedIds.map((id, index) =>
    supabase
      .from('event_tasks')
      .update({ position: index })
      .eq('id', id)
      .eq('event_id', eventId)
      .eq('organization_id', member.organization_id)
  )

  const results = await Promise.all(updates)
  return results.every(r => !r.error)
}

export async function addTaskNoteAction(
  eventId: string,
  taskId: string,
  content: string
): Promise<EventTaskNote | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return null

  if (!content.trim() || content.length > 10000) return null

  const { data: authorRow } = await supabase
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const { data } = await supabase
    .from('event_task_notes')
    .insert({
      task_id: taskId,
      event_id: eventId,
      organization_id: member.organization_id,
      author_id: authorRow?.id ?? null,
      content: content.trim(),
    })
    .select('*, author:team_members!author_id(id, full_name, avatar_url)')
    .returns<EventTaskNote[]>()
    .single()

  return data ?? null
}

export async function deleteTaskNoteAction(
  eventId: string,
  taskId: string,
  noteId: string
): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return false

  const { error, count } = await supabase
    .from('event_task_notes')
    .delete({ count: 'exact' })
    .eq('id', noteId)
    .eq('task_id', taskId)
    .eq('organization_id', member.organization_id)

  return !error && (count ?? 0) > 0
}

export async function loadTaskNotesAction(
  eventId: string,
  taskId: string
): Promise<EventTaskNote[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return []

  const { data } = await supabase
    .from('event_task_notes')
    .select('*, author:team_members!author_id(id, full_name, avatar_url)')
    .eq('task_id', taskId)
    .eq('organization_id', member.organization_id)
    .order('created_at', { ascending: false })
    .returns<EventTaskNote[]>()

  return data ?? []
}

export async function loadTaskFilesAction(
  eventId: string,
  taskId: string
): Promise<EventTaskFileLink[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return []

  const { data } = await supabase
    .from('event_task_files')
    .select('*, file:event_files!event_file_id(*, uploader:team_members!uploaded_by(id, full_name, avatar_url))')
    .eq('task_id', taskId)
    .eq('organization_id', member.organization_id)
    .order('created_at', { ascending: false })
    .returns<EventTaskFileLink[]>()

  return data ?? []
}

export async function linkFileToTaskAction(
  eventId: string,
  taskId: string,
  eventFileId: string
): Promise<EventTaskFileLink | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return null

  const { data: linkedByRow } = await supabase
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const { data } = await supabase
    .from('event_task_files')
    .insert({
      task_id: taskId,
      event_file_id: eventFileId,
      organization_id: member.organization_id,
      linked_by: linkedByRow?.id ?? null,
    })
    .select('*, file:event_files!event_file_id(*, uploader:team_members!uploaded_by(id, full_name, avatar_url))')
    .returns<EventTaskFileLink[]>()
    .single()

  return data ?? null
}

export async function unlinkFileFromTaskAction(
  eventId: string,
  taskId: string,
  linkId: string
): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return false

  const { error, count } = await supabase
    .from('event_task_files')
    .delete({ count: 'exact' })
    .eq('id', linkId)
    .eq('task_id', taskId)
    .eq('organization_id', member.organization_id)

  return !error && (count ?? 0) > 0
}

export async function uploadFileToTaskAction(
  eventId: string,
  taskId: string,
  formData: FormData
): Promise<EventTaskFileLink | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return null

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return null

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return null
  if (file.size > MAX_FILE_SIZE) return null

  const blob = await put(file.name, file, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })

  const { data: memberRow } = await supabase
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const { data: eventFile } = await supabase
    .from('event_files')
    .insert({
      event_id: eventId,
      organization_id: member.organization_id,
      uploaded_by: memberRow?.id ?? null,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
      blob_url: blob.url,
      blob_pathname: blob.pathname,
    })
    .select('id')
    .single()

  if (!eventFile) return null

  const { data } = await supabase
    .from('event_task_files')
    .insert({
      task_id: taskId,
      event_file_id: eventFile.id,
      organization_id: member.organization_id,
      linked_by: memberRow?.id ?? null,
    })
    .select('*, file:event_files!event_file_id(*, uploader:team_members!uploaded_by(id, full_name, avatar_url))')
    .returns<EventTaskFileLink[]>()
    .single()

  return data ?? null
}

export async function loadChecklistItemsForLinkingAction(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return []

  const { data } = await supabase
    .from('event_checklist_items')
    .select('id, title, client_label, status')
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)
    .order('position', { ascending: true })

  return data ?? []
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/dashboard/events/[eventId]/tasks/actions.ts"
git commit -m "feat: event tasks server actions"
```

---

### Task 4: TaskTree client component

**Files:**
- Create: `components/events/TaskTree.tsx`

- [ ] **Step 1: Create `components/events/TaskTree.tsx`**

```tsx
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
    // Remove task and all descendants from flat list
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: errors about missing `TaskTreeNode` and `TaskSidePanel` imports — that's fine, they'll be created next.

- [ ] **Step 3: Commit**

```bash
git add components/events/TaskTree.tsx
git commit -m "feat: TaskTree component with tree builder and progress calculator"
```

---

### Task 5: TaskTreeNode component

**Files:**
- Create: `components/events/TaskTreeNode.tsx`

- [ ] **Step 1: Create `components/events/TaskTreeNode.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { ChevronRight, ChevronDown, Plus, Trash2 } from 'lucide-react'
import { format, differenceInCalendarDays, isToday, isPast } from 'date-fns'
import { pt } from 'date-fns/locale'
import { createTaskAction, updateTaskAction, deleteTaskAction } from '@/app/dashboard/events/[eventId]/tasks/actions'
import type { EventTask, EventTaskNode, ChecklistItemStatus } from '@/types/app'
import { calcProgress } from './TaskTree'

const STATUS_COLORS: Record<ChecklistItemStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  skipped: 'bg-slate-100 text-slate-500',
}

const STATUS_NEXT: Record<ChecklistItemStatus, ChecklistItemStatus> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: 'pending',
  skipped: 'pending',
}

const STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  pending: 'A fazer',
  in_progress: 'Em progresso',
  completed: 'Concluído',
  skipped: 'Ignorado',
}

interface OrgMember { id: string; full_name: string }

interface TaskTreeNodeProps {
  node: EventTaskNode
  depth: number
  eventId: string
  orgMembers: OrgMember[]
  expandedIds: Set<string>
  selectedTaskId: string | null
  onToggleExpand: (id: string) => void
  onSelect: (id: string) => void
  onUpdate: (updated: Partial<EventTask> & { id: string }) => void
  onDelete: (id: string) => void
  onCreated: (task: EventTask) => void
}

export default function TaskTreeNode({
  node, depth, eventId, orgMembers, expandedIds, selectedTaskId,
  onToggleExpand, onSelect, onUpdate, onDelete, onCreated,
}: TaskTreeNodeProps) {
  const isExpanded = expandedIds.has(node.id)
  const hasChildren = node.children.length > 0
  const isSelected = selectedTaskId === node.id
  const [addingSub, setAddingSub] = useState(false)
  const [subTitle, setSubTitle] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [, startTransition] = useTransition()

  const progress = hasChildren ? calcProgress(node) : null

  const isOverdue = !!(node.due_at && node.status !== 'completed' && node.status !== 'skipped'
    && isPast(new Date(node.due_at)) && !isToday(new Date(node.due_at)))

  const indentPx = Math.min(depth, 8) * 20

  function handleStatusClick(e: React.MouseEvent) {
    e.stopPropagation()
    const newStatus = STATUS_NEXT[node.status]
    onUpdate({ id: node.id, status: newStatus })
    startTransition(async () => {
      await updateTaskAction(eventId, node.id, { status: newStatus })
    })
  }

  function handleAddSub() {
    const trimmed = subTitle.trim()
    if (!trimmed) return
    setSubTitle('')
    setAddingSub(false)
    startTransition(async () => {
      const task = await createTaskAction(eventId, { title: trimmed, parentId: node.id })
      if (task) onCreated(task)
    })
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirmDelete) { setConfirmDelete(true); return }
    onDelete(node.id)
    startTransition(async () => {
      await deleteTaskAction(eventId, node.id)
    })
  }

  return (
    <div>
      {/* Row */}
      <div
        onClick={() => onSelect(node.id)}
        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer group transition-colors ${
          isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50'
        }`}
        style={{ paddingLeft: `${indentPx + 8}px` }}
      >
        {/* Expand chevron */}
        <button
          onClick={e => { e.stopPropagation(); if (hasChildren) onToggleExpand(node.id) }}
          className={`shrink-0 w-4 h-4 flex items-center justify-center text-slate-400 ${hasChildren ? 'hover:text-slate-700' : 'opacity-0 pointer-events-none'}`}
        >
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Status badge */}
        <button
          onClick={handleStatusClick}
          className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_COLORS[node.status]}`}
        >
          {STATUS_LABELS[node.status]}
        </button>

        {/* Title */}
        <span className={`flex-1 text-sm min-w-0 truncate ${node.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
          {node.title}
        </span>

        {/* Progress */}
        {progress && (
          <span className="shrink-0 text-[10px] text-slate-400 font-medium">
            {progress.completed}/{progress.total}
          </span>
        )}

        {/* Assignee */}
        {node.assigned_member && (
          <span className="shrink-0 w-5 h-5 rounded-full bg-slate-200 text-[9px] font-semibold text-slate-600 flex items-center justify-center">
            {node.assigned_member.full_name.split(' ').filter(Boolean).slice(0,2).map(n => n[0].toUpperCase()).join('')}
          </span>
        )}

        {/* Due date */}
        {node.due_at && (
          <span className={`shrink-0 text-[10px] font-medium ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
            {isOverdue
              ? `${Math.abs(differenceInCalendarDays(new Date(node.due_at), new Date()))}d atraso`
              : isToday(new Date(node.due_at))
              ? 'Hoje'
              : format(new Date(node.due_at), 'd MMM', { locale: pt })
            }
          </span>
        )}

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <button
            onClick={e => { e.stopPropagation(); setAddingSub(true) }}
            className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Adicionar sub-tarefa"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className={`p-1 transition-colors ${confirmDelete ? 'text-red-500 hover:text-red-700' : 'text-slate-400 hover:text-red-400'}`}
            aria-label={confirmDelete ? 'Confirmar eliminação' : 'Eliminar'}
            onBlur={() => setConfirmDelete(false)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Add sub-task input */}
      {addingSub && (
        <div
          className="flex items-center gap-2 py-1 px-2 ml-1 rounded-lg bg-slate-50 border border-slate-200 mt-0.5 mb-0.5"
          style={{ paddingLeft: `${indentPx + 32}px` }}
        >
          <input
            autoFocus
            type="text"
            value={subTitle}
            onChange={e => setSubTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddSub()
              if (e.key === 'Escape') { setAddingSub(false); setSubTitle('') }
            }}
            placeholder="Título da sub-tarefa..."
            className="flex-1 text-sm bg-transparent focus:outline-none"
          />
          <button onClick={handleAddSub} className="text-xs font-medium px-2 py-0.5 bg-slate-900 text-white rounded">OK</button>
          <button onClick={() => { setAddingSub(false); setSubTitle('') }} className="text-xs text-slate-400 hover:text-slate-700">✕</button>
        </div>
      )}

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <TaskTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              eventId={eventId}
              orgMembers={orgMembers}
              expandedIds={expandedIds}
              selectedTaskId={selectedTaskId}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onCreated={onCreated}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: errors only about missing `TaskSidePanel`.

- [ ] **Step 3: Commit**

```bash
git add components/events/TaskTreeNode.tsx
git commit -m "feat: TaskTreeNode recursive component"
```

---

### Task 6: TaskSidePanel component

**Files:**
- Create: `components/events/TaskSidePanel.tsx`

- [ ] **Step 1: Create `components/events/TaskSidePanel.tsx`**

```tsx
'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { format, differenceInCalendarDays, isToday } from 'date-fns'
import { pt } from 'date-fns/locale'
import { X, Plus, Trash2, FileText, Upload, Download, Loader2, Link2, Search, File, ImageIcon, FileSpreadsheet } from 'lucide-react'
import {
  updateTaskAction,
  loadTaskNotesAction,
  loadTaskFilesAction,
  addTaskNoteAction,
  deleteTaskNoteAction,
  uploadFileToTaskAction,
  linkFileToTaskAction,
  unlinkFileFromTaskAction,
  loadChecklistItemsForLinkingAction,
  createTaskAction,
} from '@/app/dashboard/events/[eventId]/tasks/actions'
import type { EventTask, EventTaskNote, EventTaskFileLink, ChecklistItemStatus, EventFileWithUploader } from '@/types/app'
import { calcProgress, buildTree } from './TaskTree'

const STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  pending: 'A fazer',
  in_progress: 'Em progresso',
  completed: 'Concluído',
  skipped: 'Ignorado',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File className="w-3.5 h-3.5 text-slate-400" />
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv')
    return <FileSpreadsheet className="w-3.5 h-3.5 text-green-500" />
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.startsWith('text/'))
    return <FileText className="w-3.5 h-3.5 text-red-400" />
  return <File className="w-3.5 h-3.5 text-slate-400" />
}

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

function OverdueIndicator({ dueAt, status }: { dueAt: string | null; status: ChecklistItemStatus }) {
  if (!dueAt || status === 'completed' || status === 'skipped') return null
  const due = new Date(dueAt)
  if (isToday(due)) return <span className="ml-2 text-xs font-medium text-orange-500">Hoje</span>
  const days = differenceInCalendarDays(due, new Date())
  if (days < 0) return <span className="ml-2 text-xs font-medium text-red-500">{Math.abs(days)}d em atraso</span>
  if (days <= 3) return <span className="ml-2 text-xs font-medium text-amber-500">{days}d</span>
  return null
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
  const [uploading, setUploading] = useState(false)
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)
  const [showFilePicker, setShowFilePicker] = useState(false)
  const [pickerFiles, setPickerFiles] = useState<EventFileWithUploader[]>([])
  const [pickerSearch, setPickerSearch] = useState('')
  const [addingSubTask, setAddingSubTask] = useState(false)
  const [subTaskTitle, setSubTaskTitle] = useState('')
  const [, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadTaskNotesAction(eventId, task.id).then(setNotes)
    loadTaskFilesAction(eventId, task.id).then(setFileLinks)
  }, [eventId, task.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Sync state when task prop changes (different task selected)
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

  // Progress
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

  // Direct children for sub-tasks section
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

  function handleAddNote() {
    const trimmed = noteContent.trim()
    if (!trimmed) return
    const optimisticId = `optimistic-${Date.now()}`
    const optimistic: EventTaskNote = {
      id: optimisticId, task_id: task.id, event_id: eventId, organization_id: '',
      author_id: currentMemberId, content: trimmed,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(), author: null,
    }
    setNotes(prev => prev ? [optimistic, ...prev] : [optimistic])
    setNoteContent('')
    startTransition(async () => {
      const note = await addTaskNoteAction(eventId, task.id, trimmed)
      setNotes(prev => prev
        ? note ? prev.map(n => n.id === optimisticId ? note : n) : prev.filter(n => n.id !== optimisticId)
        : null
      )
    })
  }

  function handleDeleteNote(noteId: string) {
    setDeletingNoteId(noteId)
    setNotes(prev => prev ? prev.filter(n => n.id !== noteId) : null)
    startTransition(async () => {
      await deleteTaskNoteAction(eventId, task.id, noteId)
      setDeletingNoteId(null)
    })
  }

  async function handleFileUpload(fileList: FileList) {
    setUploading(true)
    for (const file of Array.from(fileList)) {
      const fd = new FormData()
      fd.append('file', file)
      const linked = await uploadFileToTaskAction(eventId, task.id, fd)
      if (linked) setFileLinks(prev => prev ? [linked, ...prev] : [linked])
    }
    setUploading(false)
  }

  function handleUnlink(linkId: string) {
    setUnlinkingId(linkId)
    setFileLinks(prev => prev ? prev.filter(f => f.id !== linkId) : null)
    startTransition(async () => {
      await unlinkFileFromTaskAction(eventId, task.id, linkId)
      setUnlinkingId(null)
    })
  }

  async function openFilePicker() {
    const linkedIds = new Set((fileLinks ?? []).map(f => f.event_file_id))
    const all = await loadChecklistItemsForLinkingAction(eventId) as unknown as EventFileWithUploader[]
    // Note: loadChecklistItemsForLinkingAction returns checklist items, not event files.
    // For event files, we need a different approach — use the event files endpoint.
    // We'll call the existing loadEventFilesForLinkingAction from checklist actions.
    const { loadEventFilesForLinkingAction } = await import('@/app/dashboard/events/[eventId]/checklist/actions')
    const eventFiles = await loadEventFilesForLinkingAction(eventId)
    setPickerFiles(eventFiles.filter(f => !linkedIds.has(f.id)))
    setPickerSearch('')
    setShowFilePicker(true)
  }

  async function handleLinkFile(eventFile: EventFileWithUploader) {
    const linked = await linkFileToTaskAction(eventId, task.id, eventFile.id)
    if (linked) {
      setFileLinks(prev => prev ? [linked, ...prev] : [linked])
      setPickerFiles(prev => prev.filter(f => f.id !== eventFile.id))
    }
    if (pickerFiles.length <= 1) setShowFilePicker(false)
  }

  const filteredPicker = pickerFiles.filter(f =>
    !pickerSearch || f.file_name.toLowerCase().includes(pickerSearch.toLowerCase())
  )

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

          {/* Status + Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide block mb-1">Estado</label>
              <select value={status} onChange={e => { const s = e.target.value as ChecklistItemStatus; setStatus(s); saveField({ status: s }) }}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white">
                {(Object.keys(STATUS_LABELS) as ChecklistItemStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide block mb-1">Responsável</label>
              <select value={assignedTo} onChange={e => { setAssignedTo(e.target.value); saveField({ assigned_to: e.target.value || null }) }}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white">
                <option value="">Sem atribuição</option>
                {orgMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide block mb-1">
              Data limite {dueAt && <OverdueIndicator dueAt={new Date(dueAt).toISOString()} status={status} />}
            </label>
            <input type="datetime-local" value={dueAt}
              onChange={e => { setDueAt(e.target.value); saveField({ due_at: e.target.value ? new Date(e.target.value).toISOString() : null }) }}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-300" />
          </div>

          {/* Checklist link */}
          <div>
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide block mb-1">Ligar a checklist (opcional)</label>
            <select value={checklistItemId}
              onChange={e => { setChecklistItemId(e.target.value); saveField({ checklist_item_id: e.target.value || null }) }}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white">
              <option value="">Sem ligação</option>
              {checklistItems.map(ci => (
                <option key={ci.id} value={ci.id}>{ci.client_label ?? ci.title}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide block mb-1">Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              onBlur={() => saveField({ description: description || null })}
              rows={3} placeholder="Adicionar descrição..."
              className="w-full text-sm text-slate-700 placeholder-slate-300 border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-slate-300" />
          </div>

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

          {/* Notes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Notas</span>
              <span className="text-xs text-slate-400">{notes?.length ?? 0}</span>
            </div>
            <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)}
              placeholder="Adicionar nota..." rows={2}
              className="w-full text-sm text-slate-700 placeholder-slate-300 border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-slate-300 mb-1.5"
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote() }} />
            <div className="flex justify-end mb-3">
              <button onClick={handleAddNote} disabled={!noteContent.trim()}
                className="text-xs font-medium px-3 py-1.5 bg-slate-900 text-white rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors">
                Guardar
              </button>
            </div>
            {notes === null ? (
              <p className="text-xs text-slate-400">A carregar...</p>
            ) : notes.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">Sem notas ainda.</p>
            ) : (
              <div className="space-y-3">
                {notes.map(note => {
                  const initials = note.author?.full_name.split(' ').filter(Boolean).slice(0,2).map(n => n[0].toUpperCase()).join('') ?? '?'
                  const canDelete = currentMemberId && note.author_id === currentMemberId
                  const isOptimistic = note.id.startsWith('optimistic-')
                  return (
                    <div key={note.id} className={`flex items-start gap-2 ${isOptimistic ? 'opacity-60' : ''}`}>
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-[9px] font-semibold text-slate-600 flex items-center justify-center shrink-0 mt-0.5">{initials}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-slate-700">{note.author?.full_name ?? 'A guardar...'}</span>
                        </div>
                        <p className="text-xs text-slate-600 whitespace-pre-wrap break-words">{note.content}</p>
                      </div>
                      {canDelete && !isOptimistic && (
                        <button onClick={() => handleDeleteNote(note.id)} disabled={deletingNoteId === note.id}
                          className="shrink-0 text-slate-300 hover:text-red-400 transition-colors disabled:opacity-40">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100" />

          {/* Files */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Ficheiros</span>
              <span className="text-xs text-slate-400">{fileLinks?.length ?? 0}</span>
              <button onClick={openFilePicker} className="ml-auto text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors">
                <Link2 className="w-3 h-3" /> Ligar existente
              </button>
            </div>
            <label className="flex items-center justify-center w-full h-12 border border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 transition-colors bg-white mb-3">
              <input ref={fileInputRef} type="file" multiple className="hidden"
                onChange={e => e.target.files && handleFileUpload(e.target.files)} />
              {uploading
                ? <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">A carregar...</span></div>
                : <span className="text-xs text-slate-400">Clique para carregar</span>
              }
            </label>
            {fileLinks === null ? (
              <p className="text-xs text-slate-400">A carregar...</p>
            ) : fileLinks.length > 0 && (
              <div className="space-y-1">
                {fileLinks.map(link => (
                  <div key={link.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50">
                    {getFileIcon(link.file.mime_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{link.file.file_name}</p>
                      <p className="text-[10px] text-slate-400">{link.file.file_size ? formatBytes(link.file.file_size) : ''}</p>
                    </div>
                    <a href={link.file.blob_url} download={link.file.file_name}
                      className="shrink-0 text-slate-300 hover:text-slate-600 transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={() => handleUnlink(link.id)} disabled={unlinkingId === link.id}
                      className="shrink-0 text-slate-300 hover:text-red-400 transition-colors disabled:opacity-40">
                      {unlinkingId === link.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File picker modal */}
      {showFilePicker && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={() => setShowFilePicker(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[60vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-800">Ligar ficheiro existente</span>
              <button onClick={() => setShowFilePicker(false)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-4 py-2 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Pesquisar..." value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300" />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {!filteredPicker.length
                ? <p className="text-sm text-slate-400 text-center py-8">{pickerSearch ? 'Sem resultados.' : 'Todos os ficheiros já estão ligados.'}</p>
                : filteredPicker.map(f => (
                  <button key={f.id} onClick={() => handleLinkFile(f)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors">
                    {getFileIcon(f.mime_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{f.file_name}</p>
                      <p className="text-xs text-slate-400">{f.file_size ? formatBytes(f.file_size) : ''}</p>
                    </div>
                  </button>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors (all components now exist).

- [ ] **Step 3: Commit**

```bash
git add components/events/TaskSidePanel.tsx
git commit -m "feat: TaskSidePanel slide-over with notes, files, sub-tasks, checklist link"
```

---

### Task 7: Tasks page (Server Component)

**Files:**
- Create: `app/dashboard/events/[eventId]/tasks/page.tsx`

- [ ] **Step 1: Create `app/dashboard/events/[eventId]/tasks/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TaskTree } from '@/components/events/TaskTree'
import { loadEventTasksAction, loadChecklistItemsForLinkingAction } from './actions'

export default async function TasksPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: event } = await supabase
    .from('events')
    .select('id, name')
    .eq('id', eventId)
    .single()

  if (!event) notFound()

  const { data: currentMember } = await supabase
    .from('team_members')
    .select('id, organization_id')
    .eq('auth_user_id', user.id)
    .single()

  const [tasks, checklistItems, orgMembersResult] = await Promise.all([
    loadEventTasksAction(eventId),
    loadChecklistItemsForLinkingAction(eventId),
    currentMember
      ? supabase
          .from('team_members')
          .select('id, full_name')
          .eq('organization_id', currentMember.organization_id)
          .order('full_name', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])

  const orgMembers = (orgMembersResult.data ?? []) as { id: string; full_name: string }[]

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/events/${eventId}`}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> {event.name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Tarefas internas</h1>
        <p className="text-slate-500 mt-1">Gestão de trabalho interno da equipa. Não visível ao cliente.</p>
      </div>

      <TaskTree
        eventId={eventId}
        initialTasks={tasks}
        orgMembers={orgMembers}
        currentMemberId={currentMember?.id ?? null}
        checklistItems={checklistItems}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/dashboard/events/[eventId]/tasks/page.tsx"
git commit -m "feat: event tasks page"
```

---

### Task 8: Add Tarefas card to event detail page

**Files:**
- Modify: `app/dashboard/events/[eventId]/page.tsx`

- [ ] **Step 1: Read current page**

Read `app/dashboard/events/[eventId]/page.tsx` to find the import line and the quick-links grid.

- [ ] **Step 2: Add ListTree to imports**

Find the existing lucide-react import line. Add `ListTree` to it.

- [ ] **Step 3: Add task count query**

After the `fileCount` query, add:

```ts
const { count: taskCount } = await supabase
  .from('event_tasks')
  .select('id', { count: 'exact', head: true })
  .eq('event_id', eventId)
  .is('parent_id', null)
```

- [ ] **Step 4: Change grid-cols-5 to grid-cols-6**

Find `grid grid-cols-5 gap-4` and change to `grid grid-cols-6 gap-4`.

- [ ] **Step 5: Add Tarefas card**

After the Ficheiros card `</Link>`, add:

```tsx
<Link
  href={`/dashboard/events/${eventId}/tasks`}
  className="flex items-center gap-3 p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 hover:shadow transition-all"
>
  <div className="p-2 bg-indigo-50 rounded-lg">
    <ListTree className="w-5 h-5 text-indigo-600" />
  </div>
  <div>
    <p className="text-slate-800 font-medium">Tarefas</p>
    <p className="text-slate-400 text-xs">{taskCount ?? 0} tarefas</p>
  </div>
</Link>
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add "app/dashboard/events/[eventId]/page.tsx"
git commit -m "feat: add Tarefas card to event detail page"
```

---

### Task 9: Push migration + final verification

**Files:** No code changes.

- [ ] **Step 1: Push migration**

```bash
npx supabase db push
```
Expected: `Applying migration 0007_event_tasks.sql... Finished supabase db push.`

- [ ] **Step 2: Final TypeScript check**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Push to GitHub**

```bash
git push
```

---

## Self-Review

**Spec coverage:**
- [x] `event_tasks` table with adjacency list `parent_id` — Task 1
- [x] `event_task_notes` table — Task 1
- [x] `event_task_files` table — Task 1
- [x] `EventTask`, `EventTaskNode`, `EventTaskNote`, `EventTaskFileLink` types — Task 2
- [x] `loadEventTasksAction`, `createTaskAction`, `updateTaskAction`, `deleteTaskAction`, `reorderTasksAction` — Task 3
- [x] `addTaskNoteAction`, `deleteTaskNoteAction`, `loadTaskNotesAction` — Task 3
- [x] `loadTaskFilesAction`, `linkFileToTaskAction`, `unlinkFileFromTaskAction`, `uploadFileToTaskAction` — Task 3
- [x] `loadChecklistItemsForLinkingAction` — Task 3
- [x] `buildTree` — Task 4 (TaskTree)
- [x] `calcProgress` — Task 4 (TaskTree)
- [x] TaskTree client component with state, expand/collapse, selection — Task 4
- [x] TaskTreeNode recursive with status badge, progress, assignee, due date, add sub-task, delete confirm — Task 5
- [x] TaskSidePanel with title/status/assignee/due/checklist link/description/progress/sub-tasks/notes/files — Task 6
- [x] Tasks page Server Component — Task 7
- [x] Tarefas card on event detail page — Task 8
- [x] `event_tasks` never exposed to client portal — portal untouched
- [x] Existing checklist unchanged

**Placeholder scan:** None found.

**Type consistency:** `EventTask` used throughout. `EventTaskNote` used in side panel. `EventTaskFileLink` used in side panel. `calcProgress` and `buildTree` exported from `TaskTree.tsx` and imported in `TaskTreeNode.tsx` and `TaskSidePanel.tsx`. Consistent.
