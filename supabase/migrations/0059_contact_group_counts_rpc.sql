-- Quic Platform: RPC contact_group_counts para contagens agregadas de grupos (0059)
-- Segue o padrao de 0040-0058: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).
--
-- Contexto: com list_contacts_page (0058) a paginar em vez de carregar tudo,
-- as contagens no GroupsPanel (total, sem grupo, por grupo) deixam de poder
-- vir de contacts.length/filter sobre a lista carregada - passam a vir desta
-- RPC agregada, respeitando a mesma logica de visibilidade de 0058.

CREATE OR REPLACE FUNCTION contact_group_counts(
  p_organization_id uuid,
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
  -- group_id = NULL representa "total" (todos os contactos visiveis);
  -- group_id = '00000000-0000-0000-0000-000000000000' representa "sem grupo".
  SELECT NULL::uuid AS group_id, count(*)::bigint AS contact_count
  FROM clients c
  WHERE c.organization_id = p_organization_id
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
  WHERE c.organization_id = p_organization_id
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
  WHERE cg.organization_id = p_organization_id
    AND (p_is_admin OR cg.admin_only = false)
  GROUP BY cg.id;
$$;

REVOKE ALL ON FUNCTION contact_group_counts FROM PUBLIC;
GRANT EXECUTE ON FUNCTION contact_group_counts TO authenticated;
