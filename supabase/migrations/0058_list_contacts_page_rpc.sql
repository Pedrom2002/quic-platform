-- Quic Platform: RPC list_contacts_page para paginacao cursor-based de contactos (0058)
-- Segue o padrao de 0040-0057: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).
--
-- Contexto: loadContactsAction (app/dashboard/contacts/actions.ts) carregava
-- sempre a lista inteira de contactos ativos (ate 5000, .limit(5000) aplicado
-- numa sessao anterior como safety net) e aplicava filtro de visibilidade
-- (membro nao-admin so ve contactos com >=1 grupo nao-admin_only, ou sem
-- grupo nenhum - lib/contacts/visibility.ts) e filtro de grupo EM JS depois
-- da query. Isso impede paginacao real: uma pagina SQL de N linhas podia
-- resultar em menos de N apos o filtro em JS.
--
-- Esta funcao move ambos os filtros para SQL via EXISTS/NOT EXISTS, permitindo
-- paginar com LIMIT/cursor (full_name, id) directamente na base de dados.
-- p_group_id: NULL = todos, 'none' = sem grupo, uuid = grupo especifico.
-- p_is_admin: replica isContactVisibleToMember quando false.

CREATE OR REPLACE FUNCTION list_contacts_page(
  p_organization_id uuid,
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
  WHERE c.organization_id = p_organization_id
    AND c.is_active = true
    -- Visibilidade: admin ve tudo; membro so ve contactos sem grupos, ou com
    -- pelo menos um grupo que nao seja admin_only.
    AND (
      p_is_admin
      OR NOT EXISTS (SELECT 1 FROM contact_group_members cgm WHERE cgm.contact_id = c.id)
      OR EXISTS (
        SELECT 1 FROM contact_group_members cgm
        JOIN contact_groups cg ON cg.id = cgm.group_id
        WHERE cgm.contact_id = c.id AND cg.admin_only = false
      )
    )
    -- Filtro de grupo
    AND (
      p_group_id IS NULL
      OR (p_group_id = 'none' AND NOT EXISTS (SELECT 1 FROM contact_group_members cgm WHERE cgm.contact_id = c.id))
      OR (p_group_id != 'none' AND EXISTS (
        SELECT 1 FROM contact_group_members cgm
        WHERE cgm.contact_id = c.id AND cgm.group_id = p_group_id::uuid
      ))
    )
    -- Cursor: (full_name, id) > (cursor_name, cursor_id), ordem estavel com desempate por id
    AND (
      p_cursor_name IS NULL
      OR (c.full_name, c.id) > (p_cursor_name, p_cursor_id)
    )
  ORDER BY c.full_name, c.id
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION list_contacts_page FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_contacts_page TO authenticated;
