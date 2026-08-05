-- Fix: public_read_listed_events (0042b) is a row-level policy with no
-- column restriction, applying to PUBLIC (both anon and authenticated).
-- RLS row policies don't restrict columns, so any client with the anon key
-- (no session, not org-scoped) could `select('portal_token')` filtered to
-- is_public_listed = true and obtain the bearer secret for that event's
-- private portal (checklist, files, reports). Fix: revoke direct SELECT
-- on `events` for anon entirely, and expose a narrow public view for the
-- listing use case instead. The view still runs under the querying role's
-- RLS on the underlying table, so is_public_listed = true continues to
-- gate it.
--
-- authenticated is intentionally left with full column access: unlike
-- anon, authenticated reads are already gated by this schema's normal
-- organization_id-scoped RLS policies on `events` (see 0001/0002), and
-- several existing dashboard Server Actions read portal_token/settings
-- directly through the authenticated-role client (sendPortalLinkAction,
-- updatePortalVideosAction, the event detail page) — revoking those
-- columns for authenticated would break those features without closing
-- any real gap, since RLS already prevents cross-org reads there.

REVOKE SELECT ON events FROM anon;

CREATE OR REPLACE VIEW public_events_listing
WITH (security_invoker = true) AS
SELECT
  id, name, slug, description, venue_name, venue_address,
  start_datetime, end_datetime, cover_image_url
FROM events
WHERE is_public_listed = true;

GRANT SELECT ON public_events_listing TO anon, authenticated;
