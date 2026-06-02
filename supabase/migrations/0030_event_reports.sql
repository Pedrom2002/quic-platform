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
