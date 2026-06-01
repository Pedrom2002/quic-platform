# Event Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Relatórios" section to the dashboard (upload/delete) and portal (view/download) for per-event technical and contract reports.

**Architecture:** New `event_reports` table with a `report_type` enum. Dashboard page at `/dashboard/events/[eventId]/reports` follows the cliping pattern exactly. Portal gains a new "Relatórios" tab fetched in `getPortalData()`. File upload uses the existing Vercel Blob client-token flow (`/api/events/[eventId]/files/token`).

**Tech Stack:** Next.js App Router, Supabase (Postgres + RLS), Vercel Blob, Zod, Tailwind, lucide-react, date-fns

---

## File Structure

**New files:**
- `supabase/migrations/0030_event_reports.sql` — table + enum + RLS + indexes
- `app/dashboard/events/[eventId]/reports/page.tsx` — server component, list view
- `app/dashboard/events/[eventId]/reports/actions.ts` — server actions (create, delete)
- `components/events/reports/AddReportDialog.tsx` — upload dialog (client)
- `components/events/reports/DeleteReportButton.tsx` — delete button (client)

**Modified files:**
- `types/database.ts` — add `EventReport` type + `ReportType` enum
- `lib/portal/data.ts` — add `PortalReport` interface, extend `PortalEventData`, fetch in `getPortalData()`
- `app/portal/[...token]/page.tsx` — pass `reports` prop to `PortalClient`
- `app/portal/[...token]/PortalClient.tsx` — extend `TabKey`, add `ReportsTab`, wire `TabBar`
- `app/dashboard/events/[eventId]/page.tsx` — add `reportCount` query + card in grid

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/0030_event_reports.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/0030_event_reports.sql

create type report_type as enum ('technical', 'contract');

create table event_reports (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id),
  event_id         uuid not null references events(id) on delete cascade,
  uploaded_by      uuid not null references team_members(id),
  title            text not null check (char_length(title) <= 300),
  type             report_type not null,
  file_name        text not null,
  file_size        bigint,
  mime_type        text,
  blob_url         text not null,
  blob_pathname    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index on event_reports (event_id);
create index on event_reports (organization_id);

alter table event_reports enable row level security;

create policy members_read_reports on event_reports
  for select to authenticated
  using (organization_id = get_user_org_id());

create policy members_insert_reports on event_reports
  for insert to authenticated
  with check (organization_id = get_user_org_id());

create policy members_delete_reports on event_reports
  for delete to authenticated
  using (organization_id = get_user_org_id());
```

- [ ] **Step 2: Apply migration locally**

```bash
npx supabase db reset
```

Expected: migration applies without error.

- [ ] **Step 3: Push to prod**

```bash
npx supabase db push --linked
```

Expected: `0030_event_reports` applied.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0030_event_reports.sql
git commit -m "feat: add event_reports table with RLS"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `types/database.ts`

- [ ] **Step 1: Regenerate types from local DB**

```bash
npx supabase gen types typescript --local > types/database.ts
```

- [ ] **Step 2: Append EventReport type at end of file**

```typescript
export type ReportType = 'technical' | 'contract'

export type EventReport = Database['public']['Tables']['event_reports']['Row']
```

- [ ] **Step 3: Verify no TS errors**

```bash
npx tsc --noEmit 2>&1 | grep -v "test\|spec"
```

Expected: only pre-existing errors about `portal_token_revoked_at` in test files.

- [ ] **Step 4: Commit**

```bash
git add types/database.ts
git commit -m "feat: add EventReport and ReportType types"
```

---

## Task 3: Server Actions

**Files:**
- Create: `app/dashboard/events/[eventId]/reports/actions.ts`

- [ ] **Step 1: Create actions file**

```typescript
'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { del } from '@vercel/blob'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'
import type { ReportType } from '@/types/database'

const log = createLogger('reports/actions')

const ReportSchema = z.object({
  title: z.string().trim().min(1).max(300),
  type: z.enum(['technical', 'contract']),
  file_name: z.string().min(1),
  file_size: z.number().nullable(),
  mime_type: z.string().nullable(),
  blob_url: z.string().url(),
  blob_pathname: z.string(),
})

export type CreateReportResult =
  | { ok: true; reportId: string }
  | { ok: false; error: string }

export async function createReportAction(
  eventId: string,
  formData: FormData
): Promise<CreateReportResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Nao autenticado' }

  const parsed = ReportSchema.safeParse({
    title: formData.get('title'),
    type: formData.get('type'),
    file_name: formData.get('file_name'),
    file_size: formData.get('file_size') ? Number(formData.get('file_size')) : null,
    mime_type: formData.get('mime_type') || null,
    blob_url: formData.get('blob_url'),
    blob_pathname: formData.get('blob_pathname'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados invalidos' }
  }

  const { data: member } = await supabase
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!member) return { ok: false, error: 'Membro nao encontrado' }

  const { data: event } = await supabase
    .from('events')
    .select('organization_id')
    .eq('id', eventId)
    .single()
  if (!event) return { ok: false, error: 'Evento nao encontrado' }

  const { data: report, error } = await supabase
    .from('event_reports')
    .insert({
      event_id: eventId,
      organization_id: event.organization_id,
      uploaded_by: member.id,
      title: parsed.data.title,
      type: parsed.data.type as ReportType,
      file_name: parsed.data.file_name,
      file_size: parsed.data.file_size,
      mime_type: parsed.data.mime_type,
      blob_url: parsed.data.blob_url,
      blob_pathname: parsed.data.blob_pathname,
    })
    .select('id')
    .single()

  if (error || !report) {
    log.error('insert report failed', { error: error?.message })
    try { await del(parsed.data.blob_url) } catch {}
    return { ok: false, error: 'Falha ao criar relatorio' }
  }

  revalidatePath(`/dashboard/events/${eventId}/reports`)
  revalidatePath(`/dashboard/events/${eventId}`)

  return { ok: true, reportId: report.id }
}

export async function deleteReportAction(
  eventId: string,
  reportId: string,
  blobUrl: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Nao autenticado' }

  const { error } = await supabase
    .from('event_reports')
    .delete()
    .eq('id', reportId)
    .eq('event_id', eventId)

  if (error) return { ok: false, error: 'Falha ao apagar' }

  try { await del(blobUrl) } catch (e) {
    log.error('blob delete failed', { blobUrl, error: String(e) })
  }

  revalidatePath(`/dashboard/events/${eventId}/reports`)
  revalidatePath(`/dashboard/events/${eventId}`)

  return { ok: true }
}
```

- [ ] **Step 2: Verify TS**

```bash
npx tsc --noEmit 2>&1 | grep "reports/actions"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "app/dashboard/events/[eventId]/reports/actions.ts"
git commit -m "feat: add report create/delete server actions"
```

---

## Task 4: Delete Button Component

**Files:**
- Create: `components/events/reports/DeleteReportButton.tsx`

- [ ] **Step 1: Create component**

```tsx
'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteReportAction } from '@/app/dashboard/events/[eventId]/reports/actions'

interface Props {
  eventId: string
  reportId: string
  blobUrl: string
}

export function DeleteReportButton({ eventId, reportId, blobUrl }: Props) {
  const [pending, startTransition] = useTransition()

  function onClick() {
    if (!confirm('Apagar este relatório?')) return
    startTransition(async () => {
      await deleteReportAction(eventId, reportId, blobUrl)
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label="Apagar relatório"
      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/events/reports/DeleteReportButton.tsx
git commit -m "feat: add DeleteReportButton component"
```

---

## Task 5: Add Report Dialog Component

**Files:**
- Create: `components/events/reports/AddReportDialog.tsx`

Context: upload flow uses the existing Vercel Blob client-token pattern from `FilesManager.tsx`:
1. GET `/api/events/[eventId]/files/token?filename=...&mimeType=...` → `{ token, pathname }`
2. `put(pathname, file, { access: 'public', token, multipart: true })` → `{ url, pathname }`
3. Call server action with blob metadata + form fields

- [ ] **Step 1: Create component**

```tsx
'use client'

import { useState, useTransition, useRef } from 'react'
import { Plus } from 'lucide-react'
import { put } from '@vercel/blob'
import { createReportAction } from '@/app/dashboard/events/[eventId]/reports/actions'

interface Props {
  eventId: string
}

const TYPE_LABELS: Record<string, string> = {
  technical: 'Relatório Técnico',
  contract: 'Execução de Contrato',
}

export function AddReportDialog({ eventId }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setOkMsg(null)

    const form = e.currentTarget
    const title = (form.elements.namedItem('title') as HTMLInputElement).value
    const type = (form.elements.namedItem('type') as HTMLSelectElement).value
    const fileInput = form.elements.namedItem('file') as HTMLInputElement
    const file = fileInput.files?.[0]

    if (!file) {
      setError('Seleciona um ficheiro')
      return
    }

    startTransition(async () => {
      try {
        const tokenRes = await fetch(
          `/api/events/${eventId}/files/token?filename=${encodeURIComponent(file.name)}&mimeType=${encodeURIComponent(file.type)}`
        )
        if (!tokenRes.ok) {
          const j = await tokenRes.json().catch(() => ({}))
          setError((j as { error?: string }).error ?? 'Erro ao iniciar upload')
          return
        }
        const { token, pathname } = await tokenRes.json() as { token: string; pathname: string }

        const blob = await put(pathname, file, { access: 'public', token, multipart: true })

        const fd = new FormData()
        fd.set('title', title)
        fd.set('type', type)
        fd.set('file_name', file.name)
        fd.set('file_size', String(file.size))
        fd.set('mime_type', file.type)
        fd.set('blob_url', blob.url)
        fd.set('blob_pathname', blob.pathname)

        const res = await createReportAction(eventId, fd)
        if (!res.ok) {
          setError(res.error)
          return
        }

        setOkMsg('Relatório adicionado.')
        setOpen(false)
        formRef.current?.reset()
      } catch (err) {
        setError('Erro ao fazer upload: ' + String(err))
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Adicionar relatório
      </button>

      {okMsg && (
        <p className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 flex items-center justify-between gap-2">
          {okMsg}
          <button type="button" onClick={() => setOkMsg(null)} className="text-green-500 hover:text-green-700 text-xs">✕</button>
        </p>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Novo relatório</h2>
            <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="rep-title" className="block text-xs font-medium text-slate-600 mb-1">Título</label>
                <input id="rep-title" name="title" type="text" required maxLength={300}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm" />
              </div>
              <div>
                <label htmlFor="rep-type" className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                <select id="rep-type" name="type" required
                  className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm bg-white">
                  <option value="technical">Relatório Técnico</option>
                  <option value="contract">Execução de Contrato</option>
                </select>
              </div>
              <div>
                <label htmlFor="rep-file" className="block text-xs font-medium text-slate-600 mb-1">Ficheiro</label>
                <input id="rep-file" name="file" type="file" required
                  className="w-full text-sm text-slate-600 file:mr-3 file:h-8 file:px-3 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-700 file:text-xs file:font-medium hover:file:bg-slate-200" />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="h-9 px-4 text-sm rounded-md border border-slate-200 text-slate-600">Cancelar</button>
                <button type="submit" disabled={pending}
                  className="h-9 px-4 text-sm rounded-md bg-slate-900 text-white disabled:opacity-50">
                  {pending ? 'A carregar...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/events/reports/AddReportDialog.tsx
git commit -m "feat: add AddReportDialog component with blob upload"
```

---

## Task 6: Dashboard Reports Page

**Files:**
- Create: `app/dashboard/events/[eventId]/reports/page.tsx`

- [ ] **Step 1: Create page**

```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { AddReportDialog } from '@/components/events/reports/AddReportDialog'
import { DeleteReportButton } from '@/components/events/reports/DeleteReportButton'

const TYPE_LABEL: Record<string, string> = {
  technical: 'Relatório Técnico',
  contract: 'Execução de Contrato',
}

const TYPE_COLOR: Record<string, string> = {
  technical: 'bg-blue-50 text-blue-700 border-blue-200',
  contract: 'bg-amber-50 text-amber-700 border-amber-200',
}

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const supabase = await createClient()

  const [{ data: event }, { data: reports }] = await Promise.all([
    supabase.from('events').select('id, name').eq('id', eventId).single(),
    supabase
      .from('event_reports')
      .select('id, title, type, file_name, file_size, mime_type, blob_url, created_at')
      .eq('event_id', eventId)
      .order('type', { ascending: true })
      .order('created_at', { ascending: false }),
  ])

  if (!event) notFound()

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/events/${eventId}`}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> {event.name}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
            <p className="text-slate-500 mt-1">{reports?.length ?? 0} relatório(s)</p>
          </div>
          <AddReportDialog eventId={eventId} />
        </div>
      </div>

      {!reports?.length ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <FileText className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400 text-sm">Ainda não há relatórios. Adiciona o primeiro.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
          {reports.map((r) => (
            <div key={r.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-slate-800 text-sm font-medium truncate">{r.title}</p>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLOR[r.type] ?? ''}`}>
                    {TYPE_LABEL[r.type] ?? r.type}
                  </span>
                </div>
                <p className="text-slate-400 text-xs">
                  {r.file_name} ·{' '}
                  {format(new Date(r.created_at), "d MMM yyyy · HH'h'mm", { locale: pt })}
                </p>
              </div>
              <a
                href={r.blob_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-500 border border-slate-200 px-3 py-1.5 rounded-md hover:border-slate-400 hover:text-slate-700 transition-colors shrink-0"
              >
                Ver
              </a>
              <DeleteReportButton eventId={eventId} reportId={r.id} blobUrl={r.blob_url} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TS**

```bash
npx tsc --noEmit 2>&1 | grep "reports/page"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "app/dashboard/events/[eventId]/reports/page.tsx"
git commit -m "feat: add reports dashboard page"
```

---

## Task 7: Event Detail Card

**Files:**
- Modify: `app/dashboard/events/[eventId]/page.tsx`

- [ ] **Step 1: Add reportCount to Promise.all**

In `app/dashboard/events/[eventId]/page.tsx`, find the `Promise.all` block and add after the `articleCount` line:

```typescript
{ count: reportCount },
```

And add the query:

```typescript
supabase.from('event_reports').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
```

- [ ] **Step 2: Destructure reportCount**

In the destructuring of `Promise.all`, add:

```typescript
{ count: reportCount },
```

- [ ] **Step 3: Add import**

Add `FileText` to the lucide-react import line.

- [ ] **Step 4: Add card to grid**

The grid is `grid-cols-7`. Change to `grid-cols-8` and add the new card after the Cliping card:

```tsx
<Link
  href={`/dashboard/events/${eventId}/reports` as never}
  className="flex items-center gap-3 p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 hover:shadow transition-all"
>
  <div className="p-2 bg-teal-50 rounded-lg">
    <FileText className="w-5 h-5 text-teal-600" />
  </div>
  <div>
    <p className="text-slate-800 font-medium">Relatórios</p>
    <p className="text-slate-400 text-xs">{reportCount ?? 0} relatório(s)</p>
  </div>
</Link>
```

- [ ] **Step 5: Verify TS**

```bash
npx tsc --noEmit 2>&1 | grep "events/\[eventId\]/page"
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add "app/dashboard/events/[eventId]/page.tsx"
git commit -m "feat: add reports count card to event detail page"
```

---

## Task 8: Portal Data

**Files:**
- Modify: `lib/portal/data.ts`
- Modify: `app/portal/[...token]/page.tsx`

- [ ] **Step 1: Add PortalReport interface to lib/portal/data.ts**

After the `PortalArticle` interface:

```typescript
export interface PortalReport {
  id: string
  title: string
  type: 'technical' | 'contract'
  file_name: string
  file_size: number | null
  mime_type: string | null
  blob_url: string
  created_at: string
}
```

- [ ] **Step 2: Extend PortalEventData**

Add to `PortalEventData` interface:

```typescript
reports: PortalReport[]
```

- [ ] **Step 3: Add query in getPortalData()**

After the `articlesRaw` query, add:

```typescript
const { data: reportsRaw } = await supabase
  .from('event_reports')
  .select('id, title, type, file_name, file_size, mime_type, blob_url, created_at')
  .eq('event_id', eventId)
  .order('type', { ascending: true })
  .order('created_at', { ascending: false })
```

- [ ] **Step 4: Add to return object**

```typescript
reports: (reportsRaw ?? []) as PortalReport[],
```

- [ ] **Step 5: Pass prop in page.tsx**

In `app/portal/[...token]/page.tsx`, add to `<PortalClient ...>`:

```tsx
reports={data.reports}
```

- [ ] **Step 6: Verify TS**

```bash
npx tsc --noEmit 2>&1 | grep "portal"
```

Expected: only pre-existing errors.

- [ ] **Step 7: Commit**

```bash
git add lib/portal/data.ts "app/portal/[...token]/page.tsx"
git commit -m "feat: add PortalReport to portal data layer"
```

---

## Task 9: Portal UI

**Files:**
- Modify: `app/portal/[...token]/PortalClient.tsx`

- [ ] **Step 1: Add PortalReport to import**

```typescript
import type { PortalItem, PortalItemFile, PortalArticle, PortalReport } from '@/lib/portal/data'
```

- [ ] **Step 2: Extend Props interface**

Add to the `Props` interface:

```typescript
reports: PortalReport[]
```

- [ ] **Step 3: Extend TabKey**

```typescript
type TabKey = 'progress' | 'clipping' | 'reports'
```

- [ ] **Step 4: Extend TabBar**

Add `hasReports: boolean` to `TabBar` props and add to tabs array:

```typescript
...(hasReports ? [{ key: 'reports' as const, label: 'Relatórios' }] : []),
```

- [ ] **Step 5: Add ReportsTab component** (before `PortalClient` function)

```typescript
const TYPE_LABEL: Record<string, string> = {
  technical: 'Relatório Técnico',
  contract: 'Execução de Contrato',
}

function ReportsTab({ reports }: { reports: PortalReport[] }) {
  const technical = reports.filter(r => r.type === 'technical')
  const contract = reports.filter(r => r.type === 'contract')

  function Section({ title, items }: { title: string; items: PortalReport[] }) {
    if (!items.length) return null
    return (
      <div className="mb-8">
        <h3 className="text-xs font-semibold tracking-widest uppercase text-stone-500 mb-4">{title}</h3>
        <ul className="space-y-3">
          {items.map(r => {
            const downloadHref = `/api/portal/download?url=${encodeURIComponent(r.blob_url)}&name=${encodeURIComponent(r.file_name)}`
            return (
              <li key={r.id} className="bg-stone-50 border border-stone-100 rounded px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">{r.title}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {r.file_name}
                    {r.file_size && ` · ${r.file_size < 1024 * 1024 ? `${Math.round(r.file_size / 1024)} KB` : `${(r.file_size / (1024 * 1024)).toFixed(1)} MB`}`}
                  </p>
                </div>
                <a
                  href={downloadHref}
                  download={r.file_name}
                  className="text-xs text-stone-400 border border-stone-200 px-2 py-1 rounded hover:border-stone-400 hover:text-stone-600 transition-colors shrink-0"
                >
                  ↓
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <div className="anim-tab-fade">
      <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-stone-900">
        <h2 className="text-xs font-medium tracking-widest uppercase text-stone-900">
          Relatórios
        </h2>
        <span className="text-xs text-stone-400 tabular-nums">
          {String(reports.length).padStart(2, '0')}
        </span>
      </div>
      <Section title="Relatórios Técnicos" items={technical} />
      <Section title="Execução de Contrato" items={contract} />
    </div>
  )
}
```

- [ ] **Step 6: Destructure reports in PortalClient**

Add `reports` to destructured props:

```typescript
export function PortalClient({
  ...
  reports,
}: Props) {
```

- [ ] **Step 7: Update activeTab state type**

```typescript
const [activeTab, setActiveTab] = useState<'progress' | 'clipping' | 'reports'>('progress')
```

- [ ] **Step 8: Wire TabBar**

Add `hasReports={reports.length > 0}` to `<TabBar>` call.

- [ ] **Step 9: Add tab render**

After the clipping tab render:

```tsx
{activeTab === 'reports' && (
  <ReportsTab reports={reports} />
)}
```

- [ ] **Step 10: Verify TS**

```bash
npx tsc --noEmit 2>&1 | grep "PortalClient"
```

Expected: no output.

- [ ] **Step 11: Commit**

```bash
git add "app/portal/[...token]/PortalClient.tsx"
git commit -m "feat: add Relatorios tab to client portal"
git push
```
