# Event Tasks — Internal Task Management Design

## Goal

Add a dedicated internal task management system per event, separate from the client-facing checklist. Tasks are hierarchical (unlimited depth via adjacency list), support assignees, due dates, notes, file attachments, and optional linkage to checklist items. The existing checklist is unchanged.

## Architecture

### Database

**New table: `event_tasks`**

```sql
id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
event_id          uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE
organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
parent_id         uuid REFERENCES event_tasks(id) ON DELETE CASCADE  -- null = root task
checklist_item_id uuid REFERENCES event_checklist_items(id) ON DELETE SET NULL  -- optional link
title             text NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 500)
description       text
status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped'))
assigned_to       uuid REFERENCES team_members(id) ON DELETE SET NULL
due_at            timestamptz
position          integer NOT NULL DEFAULT 0
created_at        timestamptz DEFAULT now()
updated_at        timestamptz DEFAULT now()
```

Indexes: `(event_id)`, `(organization_id)`, `(parent_id)`, `(event_id, parent_id)`.
RLS: SELECT/INSERT/UPDATE/DELETE scoped to `get_user_org_id()`.
Trigger: `update_updated_at()` on UPDATE.

**New table: `event_task_notes`** — same structure as `checklist_item_notes` but FK to `event_tasks`:

```sql
id              uuid PK
task_id         uuid NOT NULL REFERENCES event_tasks(id) ON DELETE CASCADE
event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE
organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
author_id       uuid REFERENCES team_members(id) ON DELETE SET NULL
content         text NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 10000)
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

RLS: SELECT/INSERT scoped to org. DELETE: author OR admin/manager.

**New table: `event_task_files`** — same structure as `checklist_item_files` but FK to `event_tasks`:

```sql
id              uuid PK
task_id         uuid NOT NULL REFERENCES event_tasks(id) ON DELETE CASCADE
event_file_id   uuid NOT NULL REFERENCES event_files(id) ON DELETE CASCADE
organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
linked_by       uuid REFERENCES team_members(id) ON DELETE SET NULL
created_at      timestamptz DEFAULT now()
```

RLS: SELECT/INSERT/DELETE scoped to org.

Migration file: `supabase/migrations/0007_event_tasks.sql`

### Data Loading and Tree Construction

`loadEventTasksAction(eventId)` returns a flat array of all tasks for the event (with `assigned_member` join). The client builds the tree in memory:

```ts
function buildTree(flat: EventTask[]): EventTaskNode[] {
  const map = new Map<string, EventTaskNode>()
  const roots: EventTaskNode[] = []
  for (const t of flat) map.set(t.id, { ...t, children: [] })
  for (const t of flat) {
    const node = map.get(t.id)!
    if (t.parent_id) map.get(t.parent_id)?.children.push(node)
    else roots.push(node)
  }
  return roots  // sorted by position within each level
}
```

### Progress Aggregation

Computed client-side after building the tree:

```ts
function calcProgress(node: EventTaskNode): { total: number; completed: number } {
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
```

Nodes with no children count themselves. Nodes with children aggregate recursively.

### Actions

**File: `app/dashboard/events/[eventId]/tasks/actions.ts`**

- `loadEventTasksAction(eventId)` — all tasks flat with `assigned_member:team_members!assigned_to(id, full_name, avatar_url)` join
- `createTaskAction(eventId, { title, parentId?, checklistItemId? })` — insert, return new task
- `updateTaskAction(eventId, taskId, fields: { title?, description?, status?, assigned_to?, due_at?, checklist_item_id? })` — update, set `completed_at` when status=completed
- `deleteTaskAction(eventId, taskId)` — delete (cascade handles children)
- `reorderTasksAction(eventId, parentId: string | null, orderedIds: string[])` — bulk update positions for siblings
- `addTaskNoteAction(eventId, taskId, content)` — insert into `event_task_notes`, return with author join
- `deleteTaskNoteAction(eventId, taskId, noteId)` — delete with count check
- `loadTaskNotesAction(eventId, taskId)` — return notes desc
- `loadTaskFilesAction(eventId, taskId)` — return `event_task_files` joined with `event_files` + uploader
- `linkFileToTaskAction(eventId, taskId, eventFileId)` — insert into `event_task_files`
- `unlinkFileFromTaskAction(eventId, taskId, linkId)` — delete from `event_task_files`
- `uploadFileToTaskAction(eventId, taskId, formData)` — upload to Vercel Blob, insert `event_files`, insert `event_task_files`

### UI Components

**`app/dashboard/events/[eventId]/tasks/page.tsx`** — Server Component
- Fetches all tasks flat, passes to `<TaskTree>`
- Fetches org members for assignee dropdowns
- Fetches current member id

**`components/events/TaskTree.tsx`** — Client Component
- Builds tree in memory from flat array
- Renders `<TaskTreeNode>` recursively
- State: `expandedIds: Set<string>`, `selectedTaskId: string | null`
- Header: event name breadcrumb, "Nova tarefa raiz" button
- When `selectedTaskId` set: renders `<TaskSidePanel>` slide-over

**`components/events/TaskTreeNode.tsx`** — renders a single node + its children (recursive)
- Indentation: `pl-{depth * 4}` (capped at depth 8 visually)
- Shows: expand/collapse chevron (if has children), title, status badge, assignee initials, due date with overdue indicator, progress bar `X/Y` (if has children), "+" add sub-task button, "..." menu (edit, delete)
- Clicking title opens detail panel
- Status badge is clickable: cycles pending → in_progress → completed

**`components/events/TaskSidePanel.tsx`** — slide-over (same layout as `TaskDetailPanel` from checklist)
- Title (edit on blur), status dropdown, assignee dropdown, due date+time, description textarea
- Progress bar: `{completed} de {total} sub-tarefas concluídas` (hidden if leaf node)
- "Sub-tarefas diretas" section: flat list of direct children with quick-add inline input
- Notes section (reuses `ItemNotesSection` pattern with task-scoped actions)
- Files section (reuses `ItemFilesSection` pattern with task-scoped actions)
- "Ligar a checklist" dropdown: optional, lists checklist items for the event

**`app/dashboard/events/[eventId]/page.tsx`** — add "Tarefas" quick-link card (indigo icon, `ListTree` lucide icon, shows root task count)

### Data Types

```ts
// types/app.ts additions
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

## File Map

| Action | File |
|---|---|
| Create | `supabase/migrations/0007_event_tasks.sql` |
| Create | `app/dashboard/events/[eventId]/tasks/page.tsx` |
| Create | `app/dashboard/events/[eventId]/tasks/actions.ts` |
| Create | `components/events/TaskTree.tsx` |
| Create | `components/events/TaskTreeNode.tsx` |
| Create | `components/events/TaskSidePanel.tsx` |
| Modify | `app/dashboard/events/[eventId]/page.tsx` |
| Modify | `types/app.ts` |
| Modify | `types/database.ts` |

## Behaviour Details

- **Tree load:** single query on page load, flat array, client builds tree. No lazy loading of children.
- **Optimistic create:** new task appears immediately in tree at correct position; replaced with server response.
- **Optimistic status toggle:** badge updates immediately, server action fires in background.
- **Delete confirmation:** inline confirm (button turns red "Confirmar?" on first click) before firing `deleteTaskAction`. No modal.
- **Reorder:** drag-and-drop between siblings only (same parent). Uses `@dnd-kit`. Cross-parent move not supported in v1.
- **Checklist link:** optional dropdown in side panel. Selecting a checklist item stores `checklist_item_id`. Visible as a small chip "Ligado: [item title]" in the tree node.
- **Overdue logic:** same as checklist — `differenceInCalendarDays` from `date-fns`, red/orange/amber indicators.
- **Portal:** tasks are never visible in the client portal. Only `event_checklist_items` feed the portal.
- **Existing checklist:** zero changes. The two systems are independent.
