# Portal do Cliente Enriquecido — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the client portal with tabs (Progresso / Documentos / Detalhes), `due_at` badges per checklist item, and file download support at both event and item level.

**Architecture:** Extend `lib/portal/data.ts` with two new queries (item files + event files) and new types; update `app/portal/[token]/page.tsx` to pass `eventFiles`; rewrite `PortalClient.tsx` to add sticky tab navigation with three content panels while preserving all existing realtime and animation behaviour.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase JS client (admin), TypeScript, Vitest, Tailwind CSS v4, date-fns

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/portal/data.ts` | Modify | Add `PortalItemFile` type, extend `PortalItem` with `due_at`+`files`, add `eventFiles` to `PortalEventData`, add 2 queries |
| `app/portal/[token]/page.tsx` | Modify | Pass `eventFiles` prop to `PortalClient` |
| `app/portal/[token]/PortalClient.tsx` | Modify | Add tab state, `TabBar`, `ProgressTab`, `DocumentsTab`, `DetailsTab`, `FileRow` sub-components |
| `__tests__/portal-data.test.ts` | Create | Unit tests for the new data layer logic (file grouping, due_at mapping) |

---

### Task 1: Extend data types and queries in `lib/portal/data.ts`

**Files:**
- Modify: `lib/portal/data.ts`
- Create: `__tests__/portal-data.test.ts`

- [ ] **Step 1: Write failing tests for new data shapes**

Create `__tests__/portal-data.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

// Pure helper we'll extract from getPortalData — groupFilesByItem
// Takes raw checklist_item_files rows (each with checklist_item_id + event_file nested)
// Returns Map<itemId, PortalItemFile[]>
function groupFilesByItem(
  rows: Array<{
    checklist_item_id: string
    event_files: {
      id: string
      file_name: string
      file_size: number | null
      mime_type: string | null
      blob_url: string
    }
  }>
): Map<string, { id: string; file_name: string; file_size: number | null; mime_type: string | null; blob_url: string }[]> {
  const map = new Map<string, { id: string; file_name: string; file_size: number | null; mime_type: string | null; blob_url: string }[]>()
  for (const row of rows) {
    const existing = map.get(row.checklist_item_id) ?? []
    existing.push(row.event_files)
    map.set(row.checklist_item_id, existing)
  }
  return map
}

// Pure helper — filterEventLevelFiles
// Takes all event_files and the set of file IDs already linked to items
// Returns only files NOT linked to any item
function filterEventLevelFiles(
  allFiles: Array<{ id: string; file_name: string; file_size: number | null; mime_type: string | null; blob_url: string }>,
  linkedFileIds: Set<string>
): Array<{ id: string; file_name: string; file_size: number | null; mime_type: string | null; blob_url: string }> {
  return allFiles.filter(f => !linkedFileIds.has(f.id))
}

describe('groupFilesByItem', () => {
  it('returns empty map for empty input', () => {
    const result = groupFilesByItem([])
    expect(result.size).toBe(0)
  })

  it('groups files by checklist_item_id', () => {
    const rows = [
      { checklist_item_id: 'item-1', event_files: { id: 'f1', file_name: 'a.pdf', file_size: 100, mime_type: 'application/pdf', blob_url: 'https://x/a.pdf' } },
      { checklist_item_id: 'item-1', event_files: { id: 'f2', file_name: 'b.pdf', file_size: 200, mime_type: 'application/pdf', blob_url: 'https://x/b.pdf' } },
      { checklist_item_id: 'item-2', event_files: { id: 'f3', file_name: 'c.pdf', file_size: 300, mime_type: 'application/pdf', blob_url: 'https://x/c.pdf' } },
    ]
    const result = groupFilesByItem(rows)
    expect(result.get('item-1')).toHaveLength(2)
    expect(result.get('item-2')).toHaveLength(1)
    expect(result.get('item-1')![0].id).toBe('f1')
  })

  it('handles items with single file', () => {
    const rows = [
      { checklist_item_id: 'item-a', event_files: { id: 'fx', file_name: 'x.jpg', file_size: null, mime_type: 'image/jpeg', blob_url: 'https://x/x.jpg' } },
    ]
    const result = groupFilesByItem(rows)
    expect(result.get('item-a')).toHaveLength(1)
    expect(result.get('item-a')![0].file_name).toBe('x.jpg')
  })
})

describe('filterEventLevelFiles', () => {
  const allFiles = [
    { id: 'f1', file_name: 'contract.pdf', file_size: 500, mime_type: 'application/pdf', blob_url: 'https://x/contract.pdf' },
    { id: 'f2', file_name: 'rider.pdf', file_size: 300, mime_type: 'application/pdf', blob_url: 'https://x/rider.pdf' },
    { id: 'f3', file_name: 'brief.docx', file_size: 100, mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', blob_url: 'https://x/brief.docx' },
  ]

  it('returns all files when none are linked to items', () => {
    const result = filterEventLevelFiles(allFiles, new Set())
    expect(result).toHaveLength(3)
  })

  it('excludes files linked to items', () => {
    const result = filterEventLevelFiles(allFiles, new Set(['f1', 'f3']))
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('f2')
  })

  it('returns empty array when all files are linked', () => {
    const result = filterEventLevelFiles(allFiles, new Set(['f1', 'f2', 'f3']))
    expect(result).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/portal-data.test.ts
```

Expected: FAIL — `groupFilesByItem` and `filterEventLevelFiles` not imported from anywhere (they're inline in the test file for now — tests will pass). Actually these are pure functions defined inline in the test — they WILL pass. This step validates the test logic is correct before we wire up the real module.

Expected: PASS (pure functions, no external deps)

- [ ] **Step 3: Update `lib/portal/data.ts` with new types and queries**

Replace the full file content:

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyPortalToken } from './token'
import { calcProgress } from '@/lib/event-status'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

export interface PortalItemFile {
  id: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  blob_url: string
}

export interface PortalItem {
  id: string
  client_label: string | null
  title: string
  status: string
  completed_at: string | null
  completion_note: string | null
  position: number
  due_at: string | null
  files: PortalItemFile[]
}

export interface PortalEventData {
  event: {
    id: string
    name: string
    venue_name: string | null
    start_datetime: string
    status: string
  }
  eventDateStr: string
  items: PortalItem[]
  progress: { total: number; completed: number; percent: number }
  heroVideo: string | null
  contentVideo: string | null
  eventFiles: PortalItemFile[]
}

export function groupFilesByItem(
  rows: Array<{
    checklist_item_id: string
    event_files: PortalItemFile
  }>
): Map<string, PortalItemFile[]> {
  const map = new Map<string, PortalItemFile[]>()
  for (const row of rows) {
    const existing = map.get(row.checklist_item_id) ?? []
    existing.push(row.event_files)
    map.set(row.checklist_item_id, existing)
  }
  return map
}

export function filterEventLevelFiles(
  allFiles: PortalItemFile[],
  linkedFileIds: Set<string>
): PortalItemFile[] {
  return allFiles.filter(f => !linkedFileIds.has(f.id))
}

export async function getPortalData(token: string): Promise<PortalEventData | null> {
  const payload = await verifyPortalToken(token)
  if (!payload) return null

  const supabase = createAdminClient()

  const { data: eventRaw } = await supabase
    .from('events')
    .select('id, name, venue_name, start_datetime, status, settings')
    .eq('id', payload.eventId)
    .single()

  if (!eventRaw) return null

  const eventSettings = (eventRaw.settings ?? {}) as Record<string, unknown>
  const heroVideo = typeof eventSettings.portal_hero_video === 'string' ? eventSettings.portal_hero_video : null
  const contentVideo = typeof eventSettings.portal_content_video === 'string' ? eventSettings.portal_content_video : null

  const event = eventRaw as PortalEventData['event']

  const { data: itemsRaw } = await supabase
    .from('event_checklist_items')
    .select('id, client_label, title, status, completed_at, completion_note, position, due_at')
    .eq('event_id', payload.eventId)
    .eq('is_client_visible', true)
    .order('position', { ascending: true })

  const { data: itemFilesRaw } = await supabase
    .from('checklist_item_files')
    .select('checklist_item_id, event_files(id, file_name, file_size, mime_type, blob_url)')
    .eq('organization_id', event.id)

  const { data: allEventFilesRaw } = await supabase
    .from('event_files')
    .select('id, file_name, file_size, mime_type, blob_url')
    .eq('event_id', payload.eventId)
    .order('created_at', { ascending: true })

  const itemFilesRows = (itemFilesRaw ?? []) as Array<{
    checklist_item_id: string
    event_files: PortalItemFile
  }>

  const filesByItem = groupFilesByItem(itemFilesRows)

  const linkedFileIds = new Set(itemFilesRows.map(r => r.event_files.id))
  const allEventFiles = (allEventFilesRaw ?? []) as PortalItemFile[]
  const eventFiles = filterEventLevelFiles(allEventFiles, linkedFileIds)

  const items = (itemsRaw ?? []).map(item => ({
    ...item,
    due_at: item.due_at ?? null,
    files: filesByItem.get(item.id) ?? [],
  })) as PortalItem[]

  const total = items.length
  const completed = items.filter(i => i.status === 'completed').length

  return {
    event,
    eventDateStr: format(new Date(event.start_datetime), "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt }),
    items,
    progress: { total, completed, percent: calcProgress(completed, total) },
    heroVideo,
    contentVideo,
    eventFiles,
  }
}
```

**Note:** The `checklist_item_files` query uses `organization_id` filter. Check the actual column — the table has `organization_id` but we need to filter by `event_id` via the join. Correct query:

```typescript
const { data: itemFilesRaw } = await supabase
  .from('checklist_item_files')
  .select('checklist_item_id, event_files(id, file_name, file_size, mime_type, blob_url)')
  .in('checklist_item_id', (itemsRaw ?? []).map(i => i.id))
```

Use `.in('checklist_item_id', itemIds)` — filters to only items visible to client. Avoids cross-event data leak.

- [ ] **Step 4: Update the test file to import from the real module**

Update `__tests__/portal-data.test.ts` — replace inline function definitions with imports:

```typescript
import { describe, it, expect } from 'vitest'
import { groupFilesByItem, filterEventLevelFiles } from '@/lib/portal/data'

describe('groupFilesByItem', () => {
  it('returns empty map for empty input', () => {
    const result = groupFilesByItem([])
    expect(result.size).toBe(0)
  })

  it('groups files by checklist_item_id', () => {
    const rows = [
      { checklist_item_id: 'item-1', event_files: { id: 'f1', file_name: 'a.pdf', file_size: 100, mime_type: 'application/pdf', blob_url: 'https://x/a.pdf' } },
      { checklist_item_id: 'item-1', event_files: { id: 'f2', file_name: 'b.pdf', file_size: 200, mime_type: 'application/pdf', blob_url: 'https://x/b.pdf' } },
      { checklist_item_id: 'item-2', event_files: { id: 'f3', file_name: 'c.pdf', file_size: 300, mime_type: 'application/pdf', blob_url: 'https://x/c.pdf' } },
    ]
    const result = groupFilesByItem(rows)
    expect(result.get('item-1')).toHaveLength(2)
    expect(result.get('item-2')).toHaveLength(1)
    expect(result.get('item-1')![0].id).toBe('f1')
  })

  it('handles items with single file', () => {
    const rows = [
      { checklist_item_id: 'item-a', event_files: { id: 'fx', file_name: 'x.jpg', file_size: null, mime_type: 'image/jpeg', blob_url: 'https://x/x.jpg' } },
    ]
    const result = groupFilesByItem(rows)
    expect(result.get('item-a')).toHaveLength(1)
    expect(result.get('item-a')![0].file_name).toBe('x.jpg')
  })
})

describe('filterEventLevelFiles', () => {
  const allFiles = [
    { id: 'f1', file_name: 'contract.pdf', file_size: 500, mime_type: 'application/pdf', blob_url: 'https://x/contract.pdf' },
    { id: 'f2', file_name: 'rider.pdf', file_size: 300, mime_type: 'application/pdf', blob_url: 'https://x/rider.pdf' },
    { id: 'f3', file_name: 'brief.docx', file_size: 100, mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', blob_url: 'https://x/brief.docx' },
  ]

  it('returns all files when none are linked to items', () => {
    const result = filterEventLevelFiles(allFiles, new Set())
    expect(result).toHaveLength(3)
  })

  it('excludes files linked to items', () => {
    const result = filterEventLevelFiles(allFiles, new Set(['f1', 'f3']))
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('f2')
  })

  it('returns empty array when all files are linked', () => {
    const result = filterEventLevelFiles(allFiles, new Set(['f1', 'f2', 'f3']))
    expect(result).toHaveLength(0)
  })
})
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run __tests__/portal-data.test.ts
```

Expected: PASS — 6 tests

- [ ] **Step 6: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add lib/portal/data.ts __tests__/portal-data.test.ts
git commit -m "feat: extend portal data layer with files and due_at"
```

---

### Task 2: Update `page.tsx` to pass `eventFiles` prop

**Files:**
- Modify: `app/portal/[token]/page.tsx`

- [ ] **Step 1: Update page.tsx**

Replace content of `app/portal/[token]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { PortalClient } from './PortalClient'
import { getPortalData } from '@/lib/portal/data'

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const data = await getPortalData(token)
  if (!data) notFound()

  return (
    <PortalClient
      eventId={data.event.id}
      eventName={data.event.name}
      venueName={data.event.venue_name}
      eventDate={data.eventDateStr}
      status={data.event.status}
      initialItems={data.items}
      initialProgress={data.progress}
      portalToken={token}
      heroVideo={data.heroVideo}
      contentVideo={data.contentVideo}
      eventFiles={data.eventFiles}
    />
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: error on `eventFiles` prop — `PortalClient` doesn't accept it yet. This is expected; Task 3 fixes it.

- [ ] **Step 3: Commit after Task 3 is done (combined commit — see Task 3 Step 7)**

---

### Task 3: Rewrite `PortalClient.tsx` with tabs

**Files:**
- Modify: `app/portal/[token]/PortalClient.tsx`

- [ ] **Step 1: Add CSS keyframe for tab fade to the existing `<style>` block**

The existing `<style>` tag inside the component already has keyframes. Add `tab-fade` to it:

```css
@keyframes tab-fade {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.anim-tab-fade {
  animation: tab-fade 0.15s ease-out forwards;
}
```

- [ ] **Step 2: Add `PortalItemFile` import and new `Props` field**

At the top of the file, update the import:

```typescript
import type { PortalItem, PortalItemFile } from '@/lib/portal/data'
```

Update the `Props` interface:

```typescript
interface Props {
  eventId: string
  eventName: string
  venueName: string | null
  eventDate: string
  status: string
  initialItems: PortalItem[]
  initialProgress: { total: number; completed: number; percent: number }
  portalToken: string
  heroVideo: string | null
  contentVideo: string | null
  eventFiles: PortalItemFile[]
}
```

- [ ] **Step 3: Add `activeTab` state to `PortalClient`**

Inside the `PortalClient` function, after the existing state declarations:

```typescript
const [activeTab, setActiveTab] = useState<'progress' | 'documents' | 'details'>('progress')
```

Update the function signature to destructure `eventFiles`:

```typescript
export function PortalClient({
  eventId,
  eventName,
  venueName,
  eventDate,
  status,
  initialItems,
  initialProgress,
  heroVideo,
  contentVideo,
  eventFiles,
}: Props) {
```

- [ ] **Step 4: Add `FileRow` sub-component (before `PortalClient` function)**

Add this before the `export function PortalClient` line:

```typescript
function formatFileSize(bytes: number | null): string {
  if (bytes === null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileRow({ file }: { file: PortalItemFile }) {
  return (
    <div className="flex items-center gap-3 bg-stone-50 border border-stone-100 rounded px-3 py-2">
      <span className="text-stone-400 text-xs">📎</span>
      <div className="flex-1 min-w-0">
        <p className="text-stone-700 text-sm font-medium truncate">{file.file_name}</p>
        {file.file_size !== null && (
          <p className="text-stone-400 text-xs">{formatFileSize(file.file_size)}</p>
        )}
      </div>
      <a
        href={file.blob_url}
        download={file.file_name}
        className="text-xs text-stone-400 border border-stone-200 px-2 py-1 rounded hover:border-stone-400 hover:text-stone-600 transition-colors shrink-0"
        onClick={e => e.stopPropagation()}
      >
        ↓
      </a>
    </div>
  )
}
```

- [ ] **Step 5: Add `TabBar` sub-component (before `PortalClient` function)**

```typescript
function TabBar({
  active,
  hasDocuments,
  onChange,
}: {
  active: 'progress' | 'documents' | 'details'
  hasDocuments: boolean
  onChange: (tab: 'progress' | 'documents' | 'details') => void
}) {
  const tabs: Array<{ key: 'progress' | 'documents' | 'details'; label: string }> = [
    { key: 'progress', label: 'Progresso' },
    ...(hasDocuments ? [{ key: 'documents' as const, label: 'Documentos' }] : []),
    { key: 'details', label: 'Detalhes' },
  ]

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-stone-100 shadow-sm">
      <div className="w-full max-w-5xl mx-auto px-5 sm:px-8 md:px-12 flex">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`px-4 py-4 text-xs font-semibold tracking-widest uppercase transition-colors border-b-2 ${
              active === tab.key
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Add `DetailsTab` sub-component (before `PortalClient` function)**

```typescript
function DetailsTab({
  eventDate,
  venueName,
  status,
  progress,
}: {
  eventDate: string
  venueName: string | null
  status: string
  progress: { total: number; completed: number; percent: number }
}) {
  const statusLabel =
    status === 'completed' ? 'Concluído' :
    status === 'active' ? 'Em Curso' : 'Em Preparação'

  return (
    <div className="anim-tab-fade">
      <div className="grid grid-cols-2 gap-6 sm:gap-8">
        <div>
          <p className="text-xs font-medium tracking-widest uppercase text-stone-400 mb-2">Data</p>
          <p className="text-stone-900 text-sm font-medium">{eventDate}</p>
        </div>
        {venueName && (
          <div>
            <p className="text-xs font-medium tracking-widest uppercase text-stone-400 mb-2">Local</p>
            <p className="text-stone-900 text-sm font-medium">{venueName}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-medium tracking-widest uppercase text-stone-400 mb-2">Estado</p>
          <p className="text-stone-900 text-sm font-medium">{statusLabel}</p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-widest uppercase text-stone-400 mb-2">Progresso</p>
          <p className="text-stone-900 text-sm font-medium">{progress.percent}% · {progress.completed}/{progress.total}</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Add `DocumentsTab` sub-component (before `PortalClient` function)**

```typescript
function DocumentsTab({ files }: { files: PortalItemFile[] }) {
  return (
    <div className="anim-tab-fade">
      <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
        <h2 className="text-xs font-medium tracking-widest uppercase text-stone-900">
          Documentos do Evento
        </h2>
        <span className="text-xs text-stone-400 tabular-nums">
          {String(files.length).padStart(2, '0')}
        </span>
      </div>
      <ul className="space-y-3">
        {files.map(file => (
          <li key={file.id}>
            <FileRow file={file} />
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 8: Add `ProgressTab` sub-component (before `PortalClient` function)**

This replaces the inline checklist rendering currently inside `PortalClient`. Add it before `PortalClient`:

```typescript
function ProgressTab({
  completedItems,
  pendingItems,
  animatingOut,
  justCompleted,
}: {
  completedItems: PortalItem[]
  pendingItems: PortalItem[]
  animatingOut: Set<string>
  justCompleted: Set<string>
}) {
  return (
    <div className="anim-tab-fade">
      {completedItems.length > 0 && (
        <div className="mb-16 sm:mb-20 md:mb-24 bg-white/70 backdrop-blur-md rounded-2xl px-6 py-8">
          <div className="flex items-baseline justify-between mb-8 sm:mb-10 pb-4 border-b border-stone-900">
            <h2 className="text-xs font-medium tracking-widest uppercase text-stone-900">
              Concluído
            </h2>
            <span className="text-xs text-stone-400 tabular-nums">
              {String(completedItems.length).padStart(2, '0')}
            </span>
          </div>
          <ul>
            {completedItems.map((item, idx) => {
              const isNew = justCompleted.has(item.id)
              return (
                <li
                  key={item.id}
                  className={`flex flex-col sm:grid sm:grid-cols-[2rem_1fr_auto] gap-2 sm:gap-6 md:gap-10 py-5 sm:py-6 pl-4 border-l-2 border-b border-stone-100 last:border-b-0 mb-0 ${
                    isNew
                      ? 'anim-item-enter anim-pulse-gold border-l-amber-400'
                      : 'border-l-amber-400/50 anim-fade-in'
                  }`}
                  style={isNew ? undefined : { animationDelay: `${300 + idx * 40}ms` }}
                >
                  <span className="text-xs text-amber-600/70 tabular-nums tracking-wider font-medium pt-0.5">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-stone-900 text-base sm:text-lg font-medium tracking-tight">
                      {item.client_label ?? item.title}
                    </p>
                    {item.completion_note && (
                      <p className="text-stone-500 text-sm mt-1.5 leading-relaxed anim-fade-in" style={{ animationDelay: isNew ? '150ms' : `${300 + idx * 40 + 150}ms` }}>
                        {item.completion_note}
                      </p>
                    )}
                    {item.files.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {item.files.map(file => (
                          <FileRow key={file.id} file={file} />
                        ))}
                      </div>
                    )}
                  </div>
                  {item.completed_at && (
                    <span className="text-xs text-stone-400 tabular-nums whitespace-nowrap self-start sm:text-right">
                      {format(new Date(item.completed_at), "d MMM · HH'h'mm", { locale: pt })}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {pendingItems.length > 0 && (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl px-6 py-8">
          <div className="flex items-baseline justify-between mb-8 sm:mb-10 pb-4 border-b border-stone-200">
            <h2 className="text-xs font-medium tracking-widest uppercase text-stone-500">
              Em Preparação
            </h2>
            <span className="text-xs text-stone-500 tabular-nums">
              {String(pendingItems.length).padStart(2, '0')}
            </span>
          </div>
          <ul>
            {pendingItems.map((item, idx) => (
              <li
                key={item.id}
                className={`flex flex-col sm:grid sm:grid-cols-[2rem_1fr_auto] gap-2 sm:gap-6 md:gap-10 py-5 sm:py-6 border-b border-stone-100 last:border-0 anim-fade-in ${
                  animatingOut.has(item.id) ? 'anim-item-exit' : ''
                }`}
                style={{ animationDelay: `${300 + idx * 40}ms` }}
              >
                <span className="text-xs text-stone-400 tabular-nums tracking-wider font-medium pt-0.5">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <p className="text-stone-500 text-base sm:text-lg tracking-tight">
                  {item.client_label ?? item.title}
                </p>
                {(item.status === 'pending' || item.status === 'in_progress') && item.due_at && (
                  <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap self-start">
                    Previsto {format(new Date(item.due_at), 'd MMM', { locale: pt })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 9: Update the main `PortalClient` render — replace content section**

In the `PortalClient` component return, replace the existing `<section className="relative">` block (lines ~291-381 in original file) with:

```tsx
{/* Tab navigation + content */}
<TabBar
  active={activeTab}
  hasDocuments={eventFiles.length > 0}
  onChange={setActiveTab}
/>

<section className="relative">
  <video
    autoPlay
    muted
    loop
    playsInline
    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
    src={contentVideo ?? FALLBACK_CONTENT_VIDEO}
  />
  <div className="absolute inset-0 bg-white/30 pointer-events-none" />
  <section className="relative z-10 w-full max-w-5xl mx-auto px-5 sm:px-8 md:px-12 py-12 sm:py-16 md:py-24">
    {activeTab === 'progress' && (
      <ProgressTab
        completedItems={completedItems}
        pendingItems={pendingItems}
        animatingOut={animatingOut}
        justCompleted={justCompleted}
      />
    )}
    {activeTab === 'documents' && eventFiles.length > 0 && (
      <DocumentsTab files={eventFiles} />
    )}
    {activeTab === 'details' && (
      <DetailsTab
        eventDate={eventDate}
        venueName={venueName}
        status={status}
        progress={progress}
      />
    )}
  </section>
</section>
```

The `<TabBar>` goes between the hero `</section>` closing tag and this new `<section className="relative">`.

- [ ] **Step 10: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 11: Run all tests**

```bash
npx vitest run
```

Expected: all pass including the 6 new portal-data tests

- [ ] **Step 12: Commit**

```bash
git add app/portal/[token]/page.tsx app/portal/[token]/PortalClient.tsx
git commit -m "feat: portal tabs (Progresso/Documentos/Detalhes) with files and due_at"
```

---

### Task 4: Manual smoke test

**Files:** none (testing only)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open a portal URL**

Navigate to a portal URL (e.g. `http://localhost:3000/portal/<token>`). Verify:

- Hero loads with progress bar
- Tabs appear sticky after scrolling past the hero
- "Progresso" tab is active by default — checklist items visible
- Pending items with `due_at` show amber "Previsto DD Mmm" badge
- Completed items with linked files show `FileRow` pills with download link
- Clicking "Documentos" tab shows event-level files (or tab is absent if none)
- Clicking "Detalhes" tab shows data/local/estado/progresso grid
- Switching tabs shows fade animation
- Realtime still works: mark an item complete in dashboard and verify it moves in portal without page reload

- [ ] **Step 3: Verify mobile layout**

Open DevTools, set viewport to 375px. Verify tabs are scrollable horizontally if needed and items stack correctly.

- [ ] **Step 4: Commit if any fixes were needed**

```bash
git add -p
git commit -m "fix: portal tab layout adjustments"
```
