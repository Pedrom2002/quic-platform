# Checklist Evolution — Task Management System

## Goal

Evolve `event_checklist_items` from a simple list into a full internal task management system: kanban board, per-task detail panel, due dates with overdue counters, assignees, append-only notes, and file attachments (upload or link from event files).

## Architecture

### Database

Two new tables:

**`checklist_item_notes`** — append-only notes per checklist item, same pattern as `event_notes`:
```sql
id, checklist_item_id (FK), event_id (FK), organization_id (FK),
author_id (FK team_members, SET NULL), content text (1–10000 chars),
created_at, updated_at
```
RLS: SELECT/INSERT scoped to `get_user_org_id()`. DELETE: author OR admin/manager.

**`checklist_item_files`** — join table linking files to tasks (many-to-many):
```sql
id, checklist_item_id (FK), event_file_id (FK event_files, CASCADE),
organization_id (FK), linked_by (FK team_members, SET NULL), created_at
```
RLS: SELECT/INSERT/DELETE scoped to `get_user_org_id()`.
When a file is uploaded directly to a task: file is inserted into `event_files` first, then a row is inserted into `checklist_item_files`. When linking an existing file: only `checklist_item_files` row is inserted.

The `event_checklist_items` table already has `due_at (timestamptz)`, `assigned_to (uuid)`, `description (text)` — no schema changes needed.

### New Actions

**`app/dashboard/events/[eventId]/checklist/actions.ts`** additions:
- `updateChecklistItemAction(eventId, itemId, fields)` — updates title, description, due_at, assigned_to, status on a single item
- `addItemNoteAction(eventId, itemId, content)` — inserts into `checklist_item_notes`, returns with author join
- `deleteItemNoteAction(eventId, itemId, noteId)` — auth + org + author/manager check
- `linkFileToItemAction(eventId, itemId, eventFileId)` — inserts into `checklist_item_files`
- `unlinkFileFromItemAction(eventId, itemId, linkId)` — deletes from `checklist_item_files`
- `uploadFileToItemAction(eventId, itemId, formData)` — uploads to Vercel Blob, inserts into `event_files`, inserts into `checklist_item_files`, returns linked file
- `loadItemFilesAction(eventId, itemId)` — returns `checklist_item_files` joined with `event_files` + uploader
- `loadItemNotesAction(eventId, itemId)` — returns `checklist_item_notes` with author join
- `loadEventFilesForLinkingAction(eventId)` — returns all `event_files` for the event (for "select existing" picker)

### UI Components

**`components/events/ChecklistBoard.tsx`** — extended:
- Toggle button (List / Board) in header
- Board view: 4 columns (`pending`, `in_progress`, `completed`, `skipped`) using `@dnd-kit`; drag between columns updates status
- List view: existing behaviour preserved
- Clicking any item (card or row) opens the task detail panel

**`components/events/TaskDetailPanel.tsx`** — new slide-over (fixed right panel, `w-[480px]`):
- Closes on Escape or clicking backdrop
- **Header:** title (contenteditable or input, saves onBlur), status dropdown, close button
- **Meta row:** assignee dropdown (org members), due date+time input
- **Overdue counter:** if `due_at` is in the past and status is not `completed`/`skipped`, show `"X dias em atraso"` in red (`differenceInDays`); if due today show `"Hoje"` in orange; if due within 3 days show `"Xd"` in amber
- **Description:** textarea, saves onBlur
- **Notes section:** same component pattern as `NotesSection` but scoped to item — `ItemNotesSection` (new component or parameterized)
- **Files section:** upload zone + "Ligar ficheiro existente" button that opens a picker modal listing event files not yet linked; file rows show name, size, date, download, unlink button

**`components/events/ItemNotesSection.tsx`** — same as `NotesSection` but uses `addItemNoteAction` / `deleteItemNoteAction`.

**`components/events/ItemFilesSection.tsx`** — upload zone (calls `uploadFileToItemAction`) + link picker + file list with unlink.

### Kanban Card Design

Each card shows:
- Title (truncated to 2 lines)
- Assignee initials avatar (if assigned)
- Due date: formatted short (`3 Mai`), with overdue indicator (red dot + "Xd atraso") if past due
- Note count badge (if > 0)
- File count badge (if > 0)
- Colored left border by status (blue=in_progress, green=completed, amber=pending, slate=skipped)

### Data Loading

The checklist page (`app/dashboard/events/[eventId]/checklist/page.tsx`) already fetches items with `assigned_member` join. Extend the select to also fetch:
- `_count` of notes: subquery or separate count query for `checklist_item_notes`
- `_count` of files: subquery or separate count query for `checklist_item_files`

These counts are passed as part of the item type so cards can display badges without loading all notes/files upfront. Notes and files for a specific item are loaded lazily when the detail panel opens.

## Data Types

```ts
// types/app.ts additions
export interface ChecklistItemNote {
  id: string
  checklist_item_id: string
  event_id: string
  organization_id: string
  author_id: string | null
  content: string
  created_at: string
  updated_at: string
  author: { id: string; full_name: string; avatar_url: string | null } | null
}

export interface ChecklistItemFileLink {
  id: string
  checklist_item_id: string
  event_file_id: string
  organization_id: string
  linked_by: string | null
  created_at: string
  file: EventFileWithUploader
}

export type ItemWithMemberAndCounts = EventChecklistItem & {
  assigned_member?: { id: string; full_name: string; avatar_url: string | null } | null
  note_count: number
  file_count: number
}
```

## Files

| Action | File |
|---|---|
| Create | `supabase/migrations/0006_checklist_item_notes_files.sql` |
| Modify | `app/dashboard/events/[eventId]/checklist/actions.ts` |
| Modify | `app/dashboard/events/[eventId]/checklist/page.tsx` |
| Modify | `components/events/ChecklistBoard.tsx` |
| Create | `components/events/TaskDetailPanel.tsx` |
| Create | `components/events/ItemNotesSection.tsx` |
| Create | `components/events/ItemFilesSection.tsx` |
| Modify | `types/app.ts` |
| Modify | `types/database.ts` |

## Behaviour Details

- **Auto-save:** title and description save onBlur (debounced 500ms optional). Dropdowns (status, assignee) save immediately on change.
- **Optimistic updates:** status change from kanban drag updates UI immediately, rolls back on error. Note add/delete and file link/unlink are optimistic.
- **Overdue logic:** computed client-side from `due_at` vs `new Date()`. Status `completed` and `skipped` never show overdue.
- **File upload to task:** sequential (one at a time), same 50MB limit as `event_files`.
- **Existing file picker:** modal listing event files not already linked to this item. Search by filename. Clicking a file links it and closes modal.
- **Board drag:** uses `@dnd-kit` (already installed). Dragging a card to a different column calls `updateChecklistItemAction` with the new status. Reorder within a column is not supported (positional order maintained from list view).
- **Empty column state:** show a faint dashed placeholder card "Sem tarefas".
