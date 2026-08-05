-- Quic Platform: ativa RLS em contact_groups e contact_group_members (0052)
-- Segue o padrao de 0040-0051: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).
--
-- Contexto: 0008_contact_groups.sql criou estas duas tabelas sem NUNCA ativar RLS.
-- O grant por omissao do Supabase para o role authenticated em tabelas do schema
-- public (SELECT/INSERT/UPDATE/DELETE) nunca foi revogado, pelo que qualquer
-- membro autenticado de QUALQUER organizacao consegue ler/escrever grupos de
-- contactos de TODAS as organizacoes via supabase.from('contact_groups')...
-- directo no browser (lib/supabase/client.ts expoe um browser client anon-key).
-- contact_group_members nao tem organization_id proprio, so via group_id.

ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read_cg" ON contact_groups FOR SELECT
  USING (organization_id = get_user_org_id());
CREATE POLICY "members_insert_cg" ON contact_groups FOR INSERT
  WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_update_cg" ON contact_groups FOR UPDATE
  USING (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_delete_cg" ON contact_groups FOR DELETE
  USING (organization_id = get_user_org_id());

ALTER TABLE contact_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read_cgm" ON contact_group_members FOR SELECT
  USING (group_id IN (SELECT id FROM contact_groups WHERE organization_id = get_user_org_id()));
CREATE POLICY "members_insert_cgm" ON contact_group_members FOR INSERT
  WITH CHECK (
    group_id IN (SELECT id FROM contact_groups WHERE organization_id = get_user_org_id())
    AND contact_id IN (SELECT id FROM clients WHERE organization_id = get_user_org_id())
  );
CREATE POLICY "members_delete_cgm" ON contact_group_members FOR DELETE
  USING (group_id IN (SELECT id FROM contact_groups WHERE organization_id = get_user_org_id()));
