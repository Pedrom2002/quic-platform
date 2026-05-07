# Checklist Evolution — Task Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the checklist into a full task management system with kanban board, per-task detail panel, due dates with overdue counters, assignees, append-only notes, and file attachments.

**Architecture:** New migration adds `checklist_item_notes` and `checklist_item_files` tables. New actions handle single-item updates, notes, and file linking. `ChecklistBoard` gains a List/Board toggle; a new `TaskDetailPanel` slide-over handles editing, notes, and files per task.

**Tech Stack:** Next.js 14 App Router, Supabase, Tailwind CSS, @dnd-kit/core + @dnd-kit/sortable (already installed), @vercel/blob (already installed), date-fns, lucide-react

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `supabase/migrations/0006_checklist_item_notes_files.sql` | Two new tables + RLS |
| Modify | `types/app.ts` | 3 new interfaces |
| Modify | `types/database.ts` | Row/Insert/Update for both new tables |
| Modify | `app/dashboard/events/[eventId]/checklist/actions.ts` | 9 new actions |
| Modify | `app/dashboard/events/[eventId]/checklist/page.tsx` | Add count queries, pass currentMemberId |
| Create | `components/events/ItemNotesSection.tsx` | Append-only notes for a checklist item |
| Create | `components/events/ItemFilesSection.tsx` | File upload + link picker for a checklist item |
| Create | `components/events/TaskDetailPanel.tsx` | Slide-over panel for task detail/editing |
| Modify | `components/events/ChecklistBoard.tsx` | Add Board view + open panel on item click |

---

### Task 1: DB migration — checklist_item_notes and checklist_item_files

**Files:**
- Create: `supabase/migrations/0006_checklist_item_notes_files.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- checklist_item_notes
CREATE TABLE checklist_item_notes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id   uuid NOT NULL REFERENCES event_checklist_items(id) ON DELETE CASCADE,
  event_id            uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id           uuid REFERENCES team_members(id) ON DELETE SET NULL,
  content             text NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 10000),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
CREATE TRIGGER checklist_item_notes_updated_at BEFORE UPDATE ON checklist_item_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_cin_item ON checklist_item_notes(checklist_item_id);
CREATE INDEX idx_cin_org  ON checklist_item_notes(organization_id);
ALTER TABLE checklist_item_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read_cin"   ON checklist_item_notes FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "members_insert_cin" ON checklist_item_notes FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_delete_cin" ON checklist_item_notes FOR DELETE USING (
  organization_id = get_user_org_id()
  AND (
    author_id IN (SELECT id FROM team_members WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM team_members WHERE auth_user_id = auth.uid()
               AND organization_id = checklist_item_notes.organization_id
               AND role IN ('admin','manager'))
  )
);

-- checklist_item_files
CREATE TABLE checklist_item_files (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id   uuid NOT NULL REFERENCES event_checklist_items(id) ON DELETE CASCADE,
  event_file_id       uuid NOT NULL REFERENCES event_files(id) ON DELETE CASCADE,
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  linked_by           uuid REFERENCES team_members(id) ON DELETE SET NULL,
  created_at          timestamptz DEFAULT now()
);
CREATE INDEX idx_cif_item ON checklist_item_files(checklist_item_id);
CREATE INDEX idx_cif_org  ON checklist_item_files(organization_id);
ALTER TABLE checklist_item_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read_cif"   ON checklist_item_files FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "members_insert_cif" ON checklist_item_files FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_delete_cif" ON checklist_item_files FOR DELETE USING (organization_id = get_user_org_id());
```

- [ ] **Step 2: Push migration**

```bash
npx supabase db push
```
Expected: `Applying migration 0006_checklist_item_notes_files.sql... Finished supabase db push.`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0006_checklist_item_notes_files.sql
git commit -m "feat: checklist item notes and files tables"
```

---

### Task 2: Types — app.ts and database.ts

**Files:**
- Modify: `types/app.ts`
- Modify: `types/database.ts`

- [ ] **Step 1: Add 3 interfaces to `types/app.ts`**

Append at the end of `types/app.ts`:

```ts
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

export type ItemWithMemberAndCounts = import('./database').EventChecklistItem & {
  assigned_member?: { id: string; full_name: string; avatar_url: string | null } | null
  note_count: number
  file_count: number
}
```

- [ ] **Step 2: Add table types to `types/database.ts`**

Find where `event_files` Row/Insert/Update is defined. Add `checklist_item_notes` and `checklist_item_files` following the same pattern. Also add `EventChecklistItem` type alias if it doesn't exist (check first):

```ts
// checklist_item_notes
checklist_item_notes: {
  Row: {
    id: string
    checklist_item_id: string
    event_id: string
    organization_id: string
    author_id: string | null
    content: string
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    checklist_item_id: string
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

// checklist_item_files
checklist_item_files: {
  Row: {
    id: string
    checklist_item_id: string
    event_file_id: string
    organization_id: string
    linked_by: string | null
    created_at: string
  }
  Insert: {
    id?: string
    checklist_item_id: string
    event_file_id: string
    organization_id: string
    linked_by?: string | null
    created_at?: string
  }
  Update: Record<string, never>
  Relationships: []
}
```

Then add type aliases near the other aliases (e.g. `EventNote`, `EventFile`):
```ts
export type ChecklistItemNote = Database['public']['Tables']['checklist_item_notes']['Row']
export type ChecklistItemFileLink = Database['public']['Tables']['checklist_item_files']['Row']
```

Also check if `EventChecklistItem` alias exists. If not, add:
```ts
export type EventChecklistItem = Database['public']['Tables']['event_checklist_items']['Row']
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add types/app.ts types/database.ts
git commit -m "feat: checklist item notes and files types"
```

---

### Task 3: Actions — single-item update + notes + files

**Files:**
- Modify: `app/dashboard/events/[eventId]/checklist/actions.ts`

Context: The file already has `bulkUpdateChecklistStatusAction`, `loadOrgTeamMembersAction`, `reorderChecklistItemsAction`, and a local `assertEventOwnership` helper. Add the new actions below the existing ones.

- [ ] **Step 1: Add imports at the top of the file**

Add to the existing imports in `app/dashboard/events/[eventId]/checklist/actions.ts`:

```ts
import { put, del } from '@vercel/blob'
import { MAX_FILE_SIZE } from '@/schemas/file.schema'
import type { ChecklistItemNote, ChecklistItemFileLink } from '@/types/app'
import type { EventFileWithUploader } from '@/types/app'
```

- [ ] **Step 2: Add `updateChecklistItemAction`**

```ts
export async function updateChecklistItemAction(
  eventId: string,
  itemId: string,
  fields: {
    title?: string
    description?: string | null
    due_at?: string | null
    assigned_to?: string | null
    status?: ChecklistItemStatus
  }
) {
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

  const { data, error } = await supabase
    .from('event_checklist_items')
    .update(updateData)
    .eq('id', itemId)
    .eq('event_id', eventId)
    .select('*, assigned_member:team_members!assigned_to(id, full_name, avatar_url)')
    .single()

  if (error) return null
  return data
}
```

- [ ] **Step 3: Add `addItemNoteAction` and `deleteItemNoteAction`**

```ts
export async function addItemNoteAction(
  eventId: string,
  itemId: string,
  content: string
): Promise<ChecklistItemNote | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return null

  const owns = await assertEventOwnership(supabase, eventId, member.organization_id)
  if (!owns) return null

  if (!content.trim() || content.length > 10000) return null

  const { data: authorRow } = await supabase
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const { data } = await supabase
    .from('checklist_item_notes')
    .insert({
      checklist_item_id: itemId,
      event_id: eventId,
      organization_id: member.organization_id,
      author_id: authorRow?.id ?? null,
      content: content.trim(),
    })
    .select('*, author:team_members!author_id(id, full_name, avatar_url)')
    .returns<ChecklistItemNote[]>()
    .single()

  return data ?? null
}

export async function deleteItemNoteAction(
  eventId: string,
  itemId: string,
  noteId: string
): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return false

  const { error, count } = await supabase
    .from('checklist_item_notes')
    .delete({ count: 'exact' })
    .eq('id', noteId)
    .eq('checklist_item_id', itemId)
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)

  return !error && (count ?? 0) > 0
}

export async function loadItemNotesAction(
  eventId: string,
  itemId: string
): Promise<ChecklistItemNote[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return []

  const { data } = await supabase
    .from('checklist_item_notes')
    .select('*, author:team_members!author_id(id, full_name, avatar_url)')
    .eq('checklist_item_id', itemId)
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)
    .order('created_at', { ascending: false })
    .returns<ChecklistItemNote[]>()

  return data ?? []
}
```

- [ ] **Step 4: Add file actions**

```ts
export async function loadItemFilesAction(
  eventId: string,
  itemId: string
): Promise<ChecklistItemFileLink[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return []

  const { data } = await supabase
    .from('checklist_item_files')
    .select('*, file:event_files!event_file_id(*, uploader:team_members!uploaded_by(id, full_name, avatar_url))')
    .eq('checklist_item_id', itemId)
    .eq('organization_id', member.organization_id)
    .order('created_at', { ascending: false })
    .returns<ChecklistItemFileLink[]>()

  return data ?? []
}

export async function loadEventFilesForLinkingAction(eventId: string): Promise<EventFileWithUploader[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return []

  const { data } = await supabase
    .from('event_files')
    .select('*, uploader:team_members!uploaded_by(id, full_name, avatar_url)')
    .eq('event_id', eventId)
    .eq('organization_id', member.organization_id)
    .order('created_at', { ascending: false })
    .returns<EventFileWithUploader[]>()

  return data ?? []
}

export async function linkFileToItemAction(
  eventId: string,
  itemId: string,
  eventFileId: string
): Promise<ChecklistItemFileLink | null> {
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
    .from('checklist_item_files')
    .insert({
      checklist_item_id: itemId,
      event_file_id: eventFileId,
      organization_id: member.organization_id,
      linked_by: linkedByRow?.id ?? null,
    })
    .select('*, file:event_files!event_file_id(*, uploader:team_members!uploaded_by(id, full_name, avatar_url))')
    .returns<ChecklistItemFileLink[]>()
    .single()

  return data ?? null
}

export async function unlinkFileFromItemAction(
  eventId: string,
  itemId: string,
  linkId: string
): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const member = await resolveOrgMember(supabase, user.id)
  if (!member) return false

  const { error, count } = await supabase
    .from('checklist_item_files')
    .delete({ count: 'exact' })
    .eq('id', linkId)
    .eq('checklist_item_id', itemId)
    .eq('organization_id', member.organization_id)

  return !error && (count ?? 0) > 0
}

export async function uploadFileToItemAction(
  eventId: string,
  itemId: string,
  formData: FormData
): Promise<ChecklistItemFileLink | null> {
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
    .from('checklist_item_files')
    .insert({
      checklist_item_id: itemId,
      event_file_id: eventFile.id,
      organization_id: member.organization_id,
      linked_by: memberRow?.id ?? null,
    })
    .select('*, file:event_files!event_file_id(*, uploader:team_members!uploaded_by(id, full_name, avatar_url))')
    .returns<ChecklistItemFileLink[]>()
    .single()

  return data ?? null
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "app/dashboard/events/[eventId]/checklist/actions.ts"
git commit -m "feat: checklist item update, notes, and file actions"
```

---

### Task 4: Checklist page — add count queries and currentMemberId

**Files:**
- Modify: `app/dashboard/events/[eventId]/checklist/page.tsx`

- [ ] **Step 1: Replace the page with this updated version**

```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ChecklistBoard } from '@/components/events/ChecklistBoard'
import type { ItemWithMemberAndCounts } from '@/types/app'

export default async function ChecklistPage({
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
    .select('id, name, status')
    .eq('id', eventId)
    .single()

  if (!event) notFound()

  const { data: items } = await supabase
    .from('event_checklist_items')
    .select('*, assigned_member:team_members!assigned_to(id, full_name, avatar_url)')
    .eq('event_id', eventId)
    .order('position', { ascending: true })

  // Count notes and files per item
  const itemIds = (items ?? []).map(i => i.id)

  const [{ data: noteCounts }, { data: fileCounts }] = await Promise.all([
    itemIds.length
      ? supabase
          .from('checklist_item_notes')
          .select('checklist_item_id')
          .in('checklist_item_id', itemIds)
      : Promise.resolve({ data: [] }),
    itemIds.length
      ? supabase
          .from('checklist_item_files')
          .select('checklist_item_id')
          .in('checklist_item_id', itemIds)
      : Promise.resolve({ data: [] }),
  ])

  const noteCountMap = new Map<string, number>()
  for (const r of noteCounts ?? []) {
    noteCountMap.set(r.checklist_item_id, (noteCountMap.get(r.checklist_item_id) ?? 0) + 1)
  }
  const fileCountMap = new Map<string, number>()
  for (const r of fileCounts ?? []) {
    fileCountMap.set(r.checklist_item_id, (fileCountMap.get(r.checklist_item_id) ?? 0) + 1)
  }

  const { data: currentMember } = await supabase
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  const itemsWithCounts: ItemWithMemberAndCounts[] = (items ?? []).map(item => ({
    ...item,
    note_count: noteCountMap.get(item.id) ?? 0,
    file_count: fileCountMap.get(item.id) ?? 0,
  }))

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href={`/dashboard/events/${eventId}`} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> {event.name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Checklist de Preparação</h1>
        <p className="text-slate-500 mt-1">Marque as etapas como concluídas para notificar automaticamente os clientes.</p>
      </div>

      <ChecklistBoard
        eventId={eventId}
        initialItems={itemsWithCounts}
        currentMemberId={currentMember?.id ?? null}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: errors on `ChecklistBoard` props (currentMemberId not yet accepted) — that's fine, will be fixed in Task 7.

- [ ] **Step 3: Commit**

```bash
git add "app/dashboard/events/[eventId]/checklist/page.tsx"
git commit -m "feat: checklist page adds count queries and currentMemberId"
```

---

### Task 5: ItemNotesSection component

**Files:**
- Create: `components/events/ItemNotesSection.tsx`

This is the same as `components/events/NotesSection.tsx` but uses item-scoped actions. Read `components/events/NotesSection.tsx` first to follow the same pattern.

- [ ] **Step 1: Create `components/events/ItemNotesSection.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'
import { addItemNoteAction, deleteItemNoteAction } from '@/app/dashboard/events/[eventId]/checklist/actions'
import type { ChecklistItemNote } from '@/types/app'
import { Trash2, FileText } from 'lucide-react'

interface ItemNotesSectionProps {
  eventId: string
  itemId: string
  initialNotes: ChecklistItemNote[]
  currentMemberId: string | null
}

export default function ItemNotesSection({ eventId, itemId, initialNotes, currentMemberId }: ItemNotesSectionProps) {
  const [notes, setNotes] = useState<ChecklistItemNote[]>(initialNotes)
  const [content, setContent] = useState('')
  const [isAdding, startAddTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleAdd() {
    const trimmed = content.trim()
    if (!trimmed) return

    const optimisticId = `optimistic-${Date.now()}`
    const optimisticNote: ChecklistItemNote = {
      id: optimisticId,
      checklist_item_id: itemId,
      event_id: eventId,
      organization_id: '',
      author_id: currentMemberId,
      content: trimmed,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: null,
    }
    setNotes(prev => [optimisticNote, ...prev])
    setContent('')

    startAddTransition(async () => {
      const note = await addItemNoteAction(eventId, itemId, trimmed)
      setNotes(prev =>
        note
          ? prev.map(n => n.id === optimisticId ? note : n)
          : prev.filter(n => n.id !== optimisticId)
      )
    })
  }

  function handleDelete(noteId: string) {
    setDeletingId(noteId)
    setNotes(prev => prev.filter(n => n.id !== noteId))
    startAddTransition(async () => {
      await deleteItemNoteAction(eventId, itemId, noteId)
      setDeletingId(null)
    })
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Notas</span>
        <span className="text-xs text-slate-400">{notes.length}</span>
      </div>

      <div className="mb-3">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Adicionar nota..."
          rows={2}
          aria-label="Conteúdo da nota"
          className="w-full text-sm text-slate-700 placeholder-slate-300 border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-slate-300"
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd() }}
        />
        <div className="flex justify-end mt-1.5">
          <button
            onClick={handleAdd}
            disabled={isAdding || !content.trim()}
            className="text-xs font-medium px-3 py-1.5 bg-slate-900 text-white rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors"
          >
            {isAdding ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {!notes.length ? (
          <p className="text-xs text-slate-400 text-center py-2">Sem notas ainda.</p>
        ) : (
          notes.map(note => {
            const initials = note.author?.full_name
              .split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('') ?? '?'
            const canDelete = currentMemberId && note.author_id === currentMemberId
            const isOptimistic = note.id.startsWith('optimistic-')
            return (
              <div key={note.id} className={`flex items-start gap-2 ${isOptimistic ? 'opacity-60' : ''}`}>
                <span className="w-6 h-6 rounded-full bg-slate-100 text-[9px] font-semibold text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                  {initials}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-slate-700">{note.author?.full_name ?? 'A guardar...'}</span>
                    <span className="text-[10px] text-slate-300">
                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: pt })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap break-words">{note.content}</p>
                </div>
                {canDelete && !isOptimistic && (
                  <button
                    onClick={() => handleDelete(note.id)}
                    disabled={deletingId === note.id}
                    className="shrink-0 text-slate-300 hover:text-red-400 transition-colors disabled:opacity-40"
                    aria-label="Apagar nota"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
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
git add components/events/ItemNotesSection.tsx
git commit -m "feat: ItemNotesSection component"
```

---

### Task 6: ItemFilesSection component

**Files:**
- Create: `components/events/ItemFilesSection.tsx`

- [ ] **Step 1: Create `components/events/ItemFilesSection.tsx`**

```tsx
'use client'

import { useState, useTransition, useRef } from 'react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import {
  uploadFileToItemAction,
  unlinkFileFromItemAction,
  linkFileToItemAction,
  loadEventFilesForLinkingAction,
} from '@/app/dashboard/events/[eventId]/checklist/actions'
import type { ChecklistItemFileLink, EventFileWithUploader } from '@/types/app'
import { Upload, Trash2, Download, FileText, ImageIcon, FileSpreadsheet, File, Loader2, Link2, X, Search } from 'lucide-react'

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

interface ItemFilesSectionProps {
  eventId: string
  itemId: string
  initialFiles: ChecklistItemFileLink[]
}

export default function ItemFilesSection({ eventId, itemId, initialFiles }: ItemFilesSectionProps) {
  const [files, setFiles] = useState<ChecklistItemFileLink[]>(initialFiles)
  const [uploading, setUploading] = useState(false)
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerFiles, setPickerFiles] = useState<EventFileWithUploader[]>([])
  const [pickerSearch, setPickerSearch] = useState('')
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(fileList: FileList) {
    setUploading(true)
    for (const file of Array.from(fileList)) {
      const fd = new FormData()
      fd.append('file', file)
      const linked = await uploadFileToItemAction(eventId, itemId, fd)
      if (linked) setFiles(prev => [linked, ...prev])
    }
    setUploading(false)
  }

  function handleUnlink(linkId: string) {
    setUnlinkingId(linkId)
    setFiles(prev => prev.filter(f => f.id !== linkId))
    startTransition(async () => {
      await unlinkFileFromItemAction(eventId, itemId, linkId)
      setUnlinkingId(null)
    })
  }

  async function openPicker() {
    const linkedFileIds = new Set(files.map(f => f.event_file_id))
    const all = await loadEventFilesForLinkingAction(eventId)
    setPickerFiles(all.filter(f => !linkedFileIds.has(f.id)))
    setPickerSearch('')
    setShowPicker(true)
  }

  async function handleLink(eventFile: EventFileWithUploader) {
    const linked = await linkFileToItemAction(eventId, itemId, eventFile.id)
    if (linked) {
      setFiles(prev => [linked, ...prev])
      setPickerFiles(prev => prev.filter(f => f.id !== eventFile.id))
    }
    if (pickerFiles.length <= 1) setShowPicker(false)
  }

  const filteredPicker = pickerFiles.filter(f =>
    !pickerSearch || f.file_name.toLowerCase().includes(pickerSearch.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Upload className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Ficheiros</span>
        <span className="text-xs text-slate-400">{files.length}</span>
        <button
          onClick={openPicker}
          className="ml-auto text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
        >
          <Link2 className="w-3 h-3" /> Ligar existente
        </button>
      </div>

      {/* Upload zone */}
      <label
        className="flex items-center justify-center w-full h-16 border border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 transition-colors bg-white mb-3"
      >
        <input ref={inputRef} type="file" multiple className="hidden"
          onChange={e => e.target.files && handleUpload(e.target.files)} />
        {uploading
          ? <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">A carregar...</span></div>
          : <span className="text-xs text-slate-400">Clique ou arraste para carregar</span>
        }
      </label>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map(link => (
            <div key={link.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 group">
              <div className="shrink-0">{getFileIcon(link.file.mime_type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">{link.file.file_name}</p>
                <p className="text-[10px] text-slate-400">
                  {link.file.file_size ? formatBytes(link.file.file_size) : ''}
                  {link.file.file_size ? ' · ' : ''}
                  {format(new Date(link.file.created_at), "d MMM", { locale: pt })}
                </p>
              </div>
              <a href={link.file.blob_url} download={link.file.file_name}
                className="shrink-0 text-slate-300 hover:text-slate-600 transition-colors" aria-label="Descarregar">
                <Download className="w-3.5 h-3.5" />
              </a>
              <button onClick={() => handleUnlink(link.id)} disabled={unlinkingId === link.id}
                className="shrink-0 text-slate-300 hover:text-red-400 transition-colors disabled:opacity-40" aria-label="Remover ligação">
                {unlinkingId === link.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Picker modal */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPicker(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[60vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-800">Ligar ficheiro existente</span>
              <button onClick={() => setShowPicker(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-2 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Pesquisar..." value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300" />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {!filteredPicker.length
                ? <p className="text-sm text-slate-400 text-center py-8">{pickerSearch ? 'Sem resultados.' : 'Todos os ficheiros ja estao ligados.'}</p>
                : filteredPicker.map(f => (
                  <button key={f.id} onClick={() => handleLink(f)}
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
git add components/events/ItemFilesSection.tsx
git commit -m "feat: ItemFilesSection component"
```

---

### Task 7: TaskDetailPanel component

**Files:**
- Create: `components/events/TaskDetailPanel.tsx`

- [ ] **Step 1: Create `components/events/TaskDetailPanel.tsx`**

```tsx
'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { format, differenceInDays, differenceInCalendarDays, isToday, isPast } from 'date-fns'
import { pt } from 'date-fns/locale'
import { X, Calendar, User } from 'lucide-react'
import {
  updateChecklistItemAction,
  loadItemNotesAction,
  loadItemFilesAction,
} from '@/app/dashboard/events/[eventId]/checklist/actions'
import ItemNotesSection from './ItemNotesSection'
import ItemFilesSection from './ItemFilesSection'
import type { ItemWithMemberAndCounts, ChecklistItemNote, ChecklistItemFileLink } from '@/types/app'
import type { ChecklistItemStatus } from '@/types/app'

const STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  pending: 'A fazer',
  in_progress: 'Em progresso',
  completed: 'Concluído',
  skipped: 'Ignorado',
}

interface OrgMember { id: string; full_name: string }

interface TaskDetailPanelProps {
  eventId: string
  item: ItemWithMemberAndCounts
  orgMembers: OrgMember[]
  currentMemberId: string | null
  onClose: () => void
  onUpdate: (updated: Partial<ItemWithMemberAndCounts> & { id: string }) => void
}

function OverdueIndicator({ dueAt, status }: { dueAt: string | null; status: ChecklistItemStatus }) {
  if (!dueAt || status === 'completed' || status === 'skipped') return null
  const due = new Date(dueAt)
  const now = new Date()
  if (isToday(due)) return <span className="text-xs font-medium text-orange-500">Hoje</span>
  const days = differenceInCalendarDays(due, now)
  if (days < 0) return <span className="text-xs font-medium text-red-500">{Math.abs(days)}d em atraso</span>
  if (days <= 3) return <span className="text-xs font-medium text-amber-500">{days}d</span>
  return null
}

export default function TaskDetailPanel({ eventId, item, orgMembers, currentMemberId, onClose, onUpdate }: TaskDetailPanelProps) {
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description ?? '')
  const [status, setStatus] = useState<ChecklistItemStatus>(item.status)
  const [assignedTo, setAssignedTo] = useState<string>(item.assigned_to ?? '')
  const [dueAt, setDueAt] = useState<string>(
    item.due_at ? format(new Date(item.due_at), "yyyy-MM-dd'T'HH:mm") : ''
  )
  const [notes, setNotes] = useState<ChecklistItemNote[] | null>(null)
  const [fileLinks, setFileLinks] = useState<ChecklistItemFileLink[] | null>(null)
  const [, startTransition] = useTransition()
  const titleRef = useRef<HTMLInputElement>(null)

  // Load notes + files lazily on mount
  useEffect(() => {
    loadItemNotesAction(eventId, item.id).then(setNotes)
    loadItemFilesAction(eventId, item.id).then(setFileLinks)
  }, [eventId, item.id])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function saveField(fields: Parameters<typeof updateChecklistItemAction>[2]) {
    startTransition(async () => {
      const updated = await updateChecklistItemAction(eventId, item.id, fields)
      if (updated) onUpdate({ id: item.id, ...fields })
    })
  }

  function handleStatusChange(newStatus: ChecklistItemStatus) {
    setStatus(newStatus)
    saveField({ status: newStatus })
  }

  function handleAssigneeChange(memberId: string) {
    setAssignedTo(memberId)
    saveField({ assigned_to: memberId || null })
  }

  function handleDueAtChange(value: string) {
    setDueAt(value)
    saveField({ due_at: value ? new Date(value).toISOString() : null })
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100">
          <input
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== item.title && saveField({ title: title.trim() })}
            className="flex-1 text-base font-semibold text-slate-900 focus:outline-none bg-transparent"
            placeholder="Título da tarefa"
          />
          <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Status + Assignee + Due */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide block mb-1">Estado</label>
              <select
                value={status}
                onChange={e => handleStatusChange(e.target.value as ChecklistItemStatus)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white"
              >
                {(Object.keys(STATUS_LABELS) as ChecklistItemStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide block mb-1">Responsável</label>
              <select
                value={assignedTo}
                onChange={e => handleAssigneeChange(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-300 bg-white"
              >
                <option value="">Sem atribuicao</option>
                {orgMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide block mb-1">
              Data limite
              {dueAt && <OverdueIndicator dueAt={new Date(dueAt).toISOString()} status={status} />}
            </label>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={e => handleDueAtChange(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-300"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wide block mb-1">Descrição</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={() => saveField({ description: description || null })}
              rows={3}
              placeholder="Adicionar descrição..."
              className="w-full text-sm text-slate-700 placeholder-slate-300 border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-slate-300"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Notes */}
          {notes !== null ? (
            <ItemNotesSection
              eventId={eventId}
              itemId={item.id}
              initialNotes={notes}
              currentMemberId={currentMemberId}
            />
          ) : (
            <p className="text-xs text-slate-400">A carregar notas...</p>
          )}

          <div className="border-t border-slate-100" />

          {/* Files */}
          {fileLinks !== null ? (
            <ItemFilesSection
              eventId={eventId}
              itemId={item.id}
              initialFiles={fileLinks}
            />
          ) : (
            <p className="text-xs text-slate-400">A carregar ficheiros...</p>
          )}

        </div>
      </div>
    </>
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
git add components/events/TaskDetailPanel.tsx
git commit -m "feat: TaskDetailPanel slide-over component"
```

---

### Task 8: ChecklistBoard — Board view + panel integration

**Files:**
- Modify: `components/events/ChecklistBoard.tsx`

This is the most complex task. Read the current file fully before editing. The board already has drag-and-drop for list reordering. We need to:
1. Accept `currentMemberId` and `ItemWithMemberAndCounts` props
2. Add a List/Board toggle state
3. Add a `TaskDetailPanel` open state
4. In Board view: render 4 columns with `@dnd-kit` drag between columns
5. In List view: existing behaviour (add click handler to open panel)

- [ ] **Step 1: Read the current ChecklistBoard to understand full structure**

Read `components/events/ChecklistBoard.tsx` lines 1–100 and then lines 100–end to understand the full component before editing.

- [ ] **Step 2: Add Board view toggle and panel state to ChecklistBoard**

At the top of the `ChecklistBoard` function, add new state:
```ts
const [view, setView] = useState<'list' | 'board'>('list')
const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
```

Update the props interface to accept `ItemWithMemberAndCounts` and `currentMemberId`:
```ts
interface ChecklistBoardProps {
  eventId: string
  initialItems: ItemWithMemberAndCounts[]
  currentMemberId: string | null
}
```

Update the `items` state type:
```ts
const [items, setItems] = useState<ItemWithMemberAndCounts[]>(initialItems)
```

- [ ] **Step 3: Add the view toggle UI to the board header**

In the JSX, find the top section with the bulk actions / controls. Add a toggle button group before (or after) the existing controls:

```tsx
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
```

- [ ] **Step 4: Add click handler to open panel on existing list items**

In `SortableChecklistItem` / `ChecklistItem`, the row already has an edit button. Add an `onOpenDetail` callback to `ChecklistItemProps`:
```ts
interface ChecklistItemProps {
  // ... existing props ...
  onOpenDetail: () => void
}
```

In the item row container div, add `onClick={onOpenDetail}` but make sure the existing action buttons call `e.stopPropagation()`.

Pass `onOpenDetail={() => setSelectedItemId(item.id)}` where `SortableChecklistItem` is rendered.

- [ ] **Step 5: Add the Board view JSX**

Below the existing list rendering (which is inside `{view === 'list' && ...}`), add the board view:

```tsx
{view === 'board' && (
  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragEnd={handleBoardDragEnd}
  >
    <div className="grid grid-cols-4 gap-4">
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
```

- [ ] **Step 6: Add `handleBoardDragEnd` function**

Add alongside `handleDragEnd`:

```ts
async function handleBoardDragEnd(event: DragEndEvent) {
  const { active, over } = event
  if (!over || active.id === over.id) return

  // `over.id` can be a column id or another item id
  // Determine target column: check if over.id is a status string
  const statuses: ChecklistItemStatus[] = ['pending', 'in_progress', 'completed', 'skipped']
  const targetStatus = statuses.includes(over.id as ChecklistItemStatus)
    ? (over.id as ChecklistItemStatus)
    : items.find(i => i.id === over.id)?.status

  if (!targetStatus) return

  const draggedItem = items.find(i => i.id === active.id)
  if (!draggedItem || draggedItem.status === targetStatus) return

  // Optimistic update
  setItems(prev => prev.map(i => i.id === active.id ? { ...i, status: targetStatus } : i))

  try {
    const { updateChecklistItemAction } = await import(
      '@/app/dashboard/events/[eventId]/checklist/actions'
    )
    await updateChecklistItemAction(eventId, active.id as string, { status: targetStatus })
  } catch {
    // Roll back
    setItems(prev => prev.map(i => i.id === active.id ? { ...i, status: draggedItem.status } : i))
  }
}
```

- [ ] **Step 7: Add `KanbanCard` component**

Add above `SortableChecklistItem`:

```tsx
function KanbanCard({ item, onClick }: { item: ItemWithMemberAndCounts; onClick: () => void }) {
  const isOverdue = item.due_at && item.status !== 'completed' && item.status !== 'skipped'
    && isPast(new Date(item.due_at)) && !isToday(new Date(item.due_at))
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
```

Add the needed imports to `ChecklistBoard.tsx`:
```ts
import { differenceInCalendarDays, isToday, isPast } from 'date-fns'
import type { ItemWithMemberAndCounts, ChecklistItemFileLink, ChecklistItemNote } from '@/types/app'
import TaskDetailPanel from './TaskDetailPanel'
```

- [ ] **Step 8: Render TaskDetailPanel**

At the bottom of the `ChecklistBoard` JSX, outside the main container, add:

```tsx
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
        setSelectedItemId(null)
      }}
    />
  )
})()}
```

- [ ] **Step 9: Verify TypeScript**

```bash
npx tsc --noEmit
```
Fix any type errors. Common ones:
- `DragEndEvent` import from `@dnd-kit/core`
- `isPast`, `isToday`, `differenceInCalendarDays` from `date-fns`
- `ItemWithMemberAndCounts` replacing `ItemWithMember` in type annotations

- [ ] **Step 10: Commit**

```bash
git add components/events/ChecklistBoard.tsx
git commit -m "feat: kanban board view and task detail panel integration"
```

---

### Task 9: Push migration and final verification

**Files:**
- No code changes

- [ ] **Step 1: Push migration to remote DB**

```bash
npx supabase db push
```
Expected: `Applying migration 0006_checklist_item_notes_files.sql... Finished supabase db push.`

- [ ] **Step 2: Final TypeScript check**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Final commit and push**

```bash
git push
```

---

## Self-Review

**Spec coverage check:**
- [x] Migration: `checklist_item_notes` + `checklist_item_files` — Task 1
- [x] Types: `ChecklistItemNote`, `ChecklistItemFileLink`, `ItemWithMemberAndCounts` — Task 2
- [x] `updateChecklistItemAction` — Task 3
- [x] `addItemNoteAction`, `deleteItemNoteAction`, `loadItemNotesAction` — Task 3
- [x] `linkFileToItemAction`, `unlinkFileFromItemAction`, `uploadFileToItemAction`, `loadItemFilesAction`, `loadEventFilesForLinkingAction` — Task 3
- [x] Checklist page count queries + `currentMemberId` — Task 4
- [x] `ItemNotesSection` with optimistic add/delete — Task 5
- [x] `ItemFilesSection` with upload + link picker + unlink — Task 6
- [x] `TaskDetailPanel` with title/status/assignee/due/description/notes/files — Task 7
- [x] Board view with 4 columns + drag between columns — Task 8
- [x] List/Board toggle — Task 8
- [x] Click item to open panel (both views) — Task 8
- [x] Overdue counter: red "Xd em atraso", orange "Hoje", amber "Xd" — Task 7 + Task 8 (`KanbanCard`)
- [x] Empty column state "Sem tarefas" — Task 8
- [x] DB push — Task 9
