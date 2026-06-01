# Event Reports Design

## Overview

Add a "Relatórios" tab to the client portal where operators upload technical reports and contract execution documents. Clients view and download them. No automatic generation — all reports are uploaded manually.

## Scope

- New `event_reports` table
- Dashboard UI: list + upload + delete at `/dashboard/events/[eventId]/reports`
- Dashboard event detail card with report count
- Portal tab "Relatórios" (hidden when empty)
- `getPortalData()` extended to fetch reports

Out of scope: report generation, versioning, notifications on upload.

## Data Model

```sql
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
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index on event_reports (event_id);
create index on event_reports (organization_id);
```

RLS policies mirror `event_articles`:
- `members_read_reports`: authenticated users whose org matches can SELECT
- `members_insert_reports`: same org, sets `organization_id` from event
- `members_delete_reports`: uploaded_by = current member OR role = 'admin'

## Dashboard

**Page:** `app/dashboard/events/[eventId]/reports/page.tsx`
- Async server component
- Parallel fetch: event + reports ordered by `created_at DESC`
- Groups display: "Relatórios Técnicos" then "Execução de Contrato"
- Empty state with icon

**Upload dialog:** `components/events/reports/AddReportDialog.tsx`
- Fields: title (text), type (select: Técnico | Execução de Contrato), file (any, max 50MB)
- Uploads to Vercel Blob first, then inserts row via server action
- Returns `{ok, reportId}` or `{ok: false, error}`

**Delete:** `components/events/reports/DeleteReportButton.tsx`
- `confirm()` → server action → deletes row + blob

**Server actions:** `app/dashboard/events/[eventId]/reports/actions.ts`
- `createReportAction(eventId, fd)`: auth → validate → blob upload → insert → revalidate
- `deleteReportAction(reportId)`: auth → delete blob → delete row → revalidate

**Event detail card:** add to grid in `app/dashboard/events/[eventId]/page.tsx`
- Icon: `FileText` (lucide), color: teal
- Count from `event_reports` query in Promise.all

## Portal

**`lib/portal/data.ts`**

New interface:
```ts
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

`PortalEventData` gains `reports: PortalReport[]`.

`getPortalData()` adds query:
```ts
const { data: reportsRaw } = await supabase
  .from('event_reports')
  .select('id, title, type, file_name, file_size, mime_type, blob_url, created_at')
  .eq('event_id', eventId)
  .order('type', { ascending: true })
  .order('created_at', { ascending: false })
```

**`app/portal/[...token]/page.tsx`** passes `reports={data.reports}` to `PortalClient`.

**`PortalClient.tsx`**

- `TabKey` extends to `'progress' | 'clipping' | 'reports'`
- `TabBar` gains `hasReports` prop, shows "Relatórios" tab when true
- New `ReportsTab` component: two sections ("Relatórios Técnicos" / "Execução de Contrato"), each with file rows showing title, filename, size, date, download button via `/api/portal/download`
- Tab hidden when `reports.length === 0`

## Type Safety

`types/database.ts` gains:
```ts
export type EventReport = Database['public']['Tables']['event_reports']['Row']
```

New route `app/dashboard/events/[eventId]/reports` needs `as never` cast on `href` until next build regenerates typed routes.

## File Storage

Uses existing Vercel Blob pattern from `event_files`. Upload in server action via `put()` from `@vercel/blob`. Delete via `del()`.

## Error Handling

- Blob upload fails → return `{ok: false, error}`, no DB insert
- DB insert fails after blob upload → delete blob, return error
- Delete: if blob delete fails, still delete DB row (blob orphan acceptable)
