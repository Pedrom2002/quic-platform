-- Fix: list_contacts_page (0058) and contact_group_counts (0059) took
-- p_organization_id as a caller-supplied parameter and used it directly with
-- no check against the session's actual organization. Both are
-- SECURITY DEFINER, so they bypass RLS entirely, and both are callable
-- directly over PostgREST by any authenticated user with the anon key, not
-- just through the app's server action (which does pass the correct org,
-- but that's not a substitute for enforcement inside the function itself).
-- This let any authenticated team member from one org read another org's
-- full contact list by passing an arbitrary organization_id.
--
-- Fix: drop the p_organization_id parameter entirely and derive the org
-- from get_user_org_id() (the same session-scoped helper every RLS policy
-- in this schema already relies on) inside the function body.

CREATE OR REPLACE FUNCTION list_contacts_page(
  p_is_admin boolean,
  p_group_id text DEFAULT NULL,
  p_cursor_name text DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  phone text,
  company text,
  notes text,
  is_active boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.full_name, c.email, c.phone, c.company, c.notes, c.is_active, c.created_at
  FROM clients c
  WHERE c.organization_id = get_user_org_id()
    AND c.is_active = true
    AND (
      p_is_admin
      OR NOT EXISTS (SELECT 1 FROM contact_group_members cgm WHERE cgm.contact_id = c.id)
      OR EXISTS (
        SELECT 1 FROM contact_group_members cgm
        JOIN contact_groups cg ON cg.id = cgm.group_id
        WHERE cgm.contact_id = c.id AND cg.admin_only = false
      )
    )
    AND (
      p_group_id IS NULL
      OR (p_group_id = 'none' AND NOT EXISTS (SELECT 1 FROM contact_group_members cgm WHERE cgm.contact_id = c.id))
      OR (p_group_id != 'none' AND EXISTS (
        SELECT 1 FROM contact_group_members cgm
        WHERE cgm.contact_id = c.id AND cgm.group_id = p_group_id::uuid
      ))
    )
    AND (
      p_cursor_name IS NULL
      OR (c.full_name, c.id) > (p_cursor_name, p_cursor_id)
    )
  ORDER BY c.full_name, c.id
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION list_contacts_page(boolean, text, text, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_contacts_page(boolean, text, text, uuid, integer) TO authenticated;

-- Drop the old signature (p_organization_id first) so PostgREST/clients can
-- no longer resolve to the vulnerable overload.
DROP FUNCTION IF EXISTS list_contacts_page(uuid, boolean, text, text, uuid, integer);

CREATE OR REPLACE FUNCTION contact_group_counts(
  p_is_admin boolean
)
RETURNS TABLE (
  group_id uuid,
  contact_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULL::uuid AS group_id, count(*)::bigint AS contact_count
  FROM clients c
  WHERE c.organization_id = get_user_org_id()
    AND c.is_active = true
    AND (
      p_is_admin
      OR NOT EXISTS (SELECT 1 FROM contact_group_members cgm WHERE cgm.contact_id = c.id)
      OR EXISTS (
        SELECT 1 FROM contact_group_members cgm
        JOIN contact_groups cg ON cg.id = cgm.group_id
        WHERE cgm.contact_id = c.id AND cg.admin_only = false
      )
    )

  UNION ALL

  SELECT '00000000-0000-0000-0000-000000000000'::uuid AS group_id, count(*)::bigint AS contact_count
  FROM clients c
  WHERE c.organization_id = get_user_org_id()
    AND c.is_active = true
    AND NOT EXISTS (SELECT 1 FROM contact_group_members cgm WHERE cgm.contact_id = c.id)
    AND (
      p_is_admin
      OR NOT EXISTS (SELECT 1 FROM contact_group_members cgm WHERE cgm.contact_id = c.id)
    )

  UNION ALL

  SELECT cg.id AS group_id, count(cgm.contact_id)::bigint AS contact_count
  FROM contact_groups cg
  LEFT JOIN contact_group_members cgm ON cgm.group_id = cg.id
  LEFT JOIN clients c ON c.id = cgm.contact_id AND c.is_active = true
  WHERE cg.organization_id = get_user_org_id()
    AND (p_is_admin OR cg.admin_only = false)
  GROUP BY cg.id;
$$;

REVOKE ALL ON FUNCTION contact_group_counts(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION contact_group_counts(boolean) TO authenticated;

DROP FUNCTION IF EXISTS contact_group_counts(uuid, boolean);
