-- Fix: /[slug] public card page had no organization scoping and matched
-- team members across ALL organizations by a name-derived slug computed at
-- request time, so a name collision across two orgs could serve the wrong
-- org's employee data, and there was no stored, unique slug to look up by.
-- This adds a real unique public_slug column so the app can do a single
-- indexed lookup instead of scanning every active member on the platform.

create extension if not exists unaccent;

alter table team_members add column if not exists public_slug text;

-- Backfill: base slug from full_name, disambiguated with a numeric suffix
-- on collision (deterministic by id order so it's stable and repeatable).
with base as (
  select
    id,
    lower(regexp_replace(unaccent(full_name), '[^a-zA-Z0-9]+', '-', 'g')) as slug_base,
    row_number() over (
      partition by lower(regexp_replace(unaccent(full_name), '[^a-zA-Z0-9]+', '-', 'g'))
      order by created_at, id
    ) as rn
  from team_members
)
update team_members tm
set public_slug = trim(both '-' from base.slug_base) || case when base.rn > 1 then '-' || base.rn else '' end
from base
where base.id = tm.id and tm.public_slug is null;

alter table team_members alter column public_slug set not null;
alter table team_members add constraint team_members_public_slug_unique unique (public_slug);
create index if not exists idx_team_members_public_slug on team_members(public_slug) where is_active = true;
