-- =========================================================
-- Quic Platform — Marketing RLS: organization scoping (security fix)
-- =========================================================
-- As políticas "team access" criadas em 0015_marketing.sql apenas verificavam
-- se o utilizador pertencia a ALGUMA equipa (EXISTS team_members WHERE
-- auth_user_id = auth.uid()), permitindo que qualquer utilizador autenticado
-- lesse/escrevesse os dados de marketing de TODAS as organizações.
--
-- As tabelas de marketing não têm coluna organization_id; o tenant é derivado
-- via created_by → team_members.organization_id. Estas políticas escopam o
-- acesso à organização do utilizador autenticado (get_user_org_id(), definido
-- em 0002_rls_policies.sql) sem qualquer alteração de schema ou dados.
-- =========================================================

-- Helper inline: conjunto de auth_user_id que partilham a organização do caller.
-- (Mantido como subquery em cada policy para evitar dependências de funções novas.)

-- ---------------------------------------------------------
-- marketing_lists — escopo pelo dono da lista
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "team access" ON marketing_lists;
CREATE POLICY "org access" ON marketing_lists
  FOR ALL
  USING (
    created_by IN (
      SELECT auth_user_id FROM team_members
      WHERE organization_id = get_user_org_id()
    )
  )
  WITH CHECK (
    created_by IN (
      SELECT auth_user_id FROM team_members
      WHERE organization_id = get_user_org_id()
    )
  );

-- ---------------------------------------------------------
-- marketing_campaigns — escopo pelo criador da campanha
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "team access" ON marketing_campaigns;
CREATE POLICY "org access" ON marketing_campaigns
  FOR ALL
  USING (
    created_by IN (
      SELECT auth_user_id FROM team_members
      WHERE organization_id = get_user_org_id()
    )
  )
  WITH CHECK (
    created_by IN (
      SELECT auth_user_id FROM team_members
      WHERE organization_id = get_user_org_id()
    )
  );

-- ---------------------------------------------------------
-- marketing_contacts — escopo via lista → dono da lista
-- Fecha também o IDOR de /api/marketing/contacts/import (list_id arbitrário).
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "team access" ON marketing_contacts;
CREATE POLICY "org access" ON marketing_contacts
  FOR ALL
  USING (
    list_id IN (
      SELECT id FROM marketing_lists
      WHERE created_by IN (
        SELECT auth_user_id FROM team_members
        WHERE organization_id = get_user_org_id()
      )
    )
  )
  WITH CHECK (
    list_id IN (
      SELECT id FROM marketing_lists
      WHERE created_by IN (
        SELECT auth_user_id FROM team_members
        WHERE organization_id = get_user_org_id()
      )
    )
  );

-- ---------------------------------------------------------
-- marketing_sends — escopo via campanha → criador da campanha
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "team access" ON marketing_sends;
CREATE POLICY "org access" ON marketing_sends
  FOR ALL
  USING (
    campaign_id IN (
      SELECT id FROM marketing_campaigns
      WHERE created_by IN (
        SELECT auth_user_id FROM team_members
        WHERE organization_id = get_user_org_id()
      )
    )
  )
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM marketing_campaigns
      WHERE created_by IN (
        SELECT auth_user_id FROM team_members
        WHERE organization_id = get_user_org_id()
      )
    )
  );

-- Nota: team_smtp_credentials já estava corretamente escopado por user_id
-- (política "own smtp creds" em 0015) e não é alterado aqui.
