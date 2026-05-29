-- =========================================================
-- Quic Platform — Marketing: organization_id real (fix arquitetural)
-- =========================================================
-- A migration 0027 escopou a RLS do marketing por organização através de
-- subqueries created_by → team_members. Funciona, mas é frágil e destoa do
-- resto do modelo, que tem organization_id explícito em cada tabela.
--
-- Esta migration:
--   1. Adiciona organization_id às tabelas de marketing.
--   2. Faz backfill a partir do dono (created_by) / da relação pai.
--   3. Adiciona triggers BEFORE INSERT que derivam organization_id
--      automaticamente — o código da app (que só define created_by) e o
--      admin client (dispatch de sends) continuam a funcionar sem alterações.
--   4. Substitui as políticas por verificação direta organization_id =
--      get_user_org_id() (mais simples, mais rápida, alinhada com o resto).
-- =========================================================

-- ---------------------------------------------------------
-- 1. Colunas
-- ---------------------------------------------------------
ALTER TABLE marketing_lists     ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE marketing_contacts  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE marketing_sends     ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- ---------------------------------------------------------
-- 2. Backfill (ordem importa: lists/campaigns → contacts/sends)
-- ---------------------------------------------------------
UPDATE marketing_lists l
  SET organization_id = tm.organization_id
  FROM team_members tm
  WHERE tm.auth_user_id = l.created_by AND l.organization_id IS NULL;

UPDATE marketing_campaigns c
  SET organization_id = tm.organization_id
  FROM team_members tm
  WHERE tm.auth_user_id = c.created_by AND c.organization_id IS NULL;

UPDATE marketing_contacts ct
  SET organization_id = l.organization_id
  FROM marketing_lists l
  WHERE l.id = ct.list_id AND ct.organization_id IS NULL;

UPDATE marketing_sends s
  SET organization_id = c.organization_id
  FROM marketing_campaigns c
  WHERE c.id = s.campaign_id AND s.organization_id IS NULL;

-- ---------------------------------------------------------
-- 3. Triggers para popular organization_id em inserts futuros
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION marketing_set_org_from_creator()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM team_members WHERE auth_user_id = NEW.created_by LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION marketing_set_org_from_list()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM marketing_lists WHERE id = NEW.list_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION marketing_set_org_from_campaign()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM marketing_campaigns WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketing_lists_org ON marketing_lists;
CREATE TRIGGER trg_marketing_lists_org BEFORE INSERT ON marketing_lists
  FOR EACH ROW EXECUTE FUNCTION marketing_set_org_from_creator();

DROP TRIGGER IF EXISTS trg_marketing_campaigns_org ON marketing_campaigns;
CREATE TRIGGER trg_marketing_campaigns_org BEFORE INSERT ON marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION marketing_set_org_from_creator();

DROP TRIGGER IF EXISTS trg_marketing_contacts_org ON marketing_contacts;
CREATE TRIGGER trg_marketing_contacts_org BEFORE INSERT ON marketing_contacts
  FOR EACH ROW EXECUTE FUNCTION marketing_set_org_from_list();

DROP TRIGGER IF EXISTS trg_marketing_sends_org ON marketing_sends;
CREATE TRIGGER trg_marketing_sends_org BEFORE INSERT ON marketing_sends
  FOR EACH ROW EXECUTE FUNCTION marketing_set_org_from_campaign();

-- ---------------------------------------------------------
-- 4. NOT NULL + índices
-- ---------------------------------------------------------
ALTER TABLE marketing_lists     ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE marketing_campaigns ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE marketing_contacts  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE marketing_sends     ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_lists_org     ON marketing_lists(organization_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_org ON marketing_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_marketing_contacts_org  ON marketing_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_marketing_sends_org     ON marketing_sends(organization_id);

-- ---------------------------------------------------------
-- 5. RLS direta por organization_id (substitui 0015 "team access" e 0027 "org access")
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "team access" ON marketing_lists;
DROP POLICY IF EXISTS "org access"  ON marketing_lists;
CREATE POLICY "org access" ON marketing_lists FOR ALL
  USING (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "team access" ON marketing_campaigns;
DROP POLICY IF EXISTS "org access"  ON marketing_campaigns;
CREATE POLICY "org access" ON marketing_campaigns FOR ALL
  USING (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "team access" ON marketing_contacts;
DROP POLICY IF EXISTS "org access"  ON marketing_contacts;
CREATE POLICY "org access" ON marketing_contacts FOR ALL
  USING (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "team access" ON marketing_sends;
DROP POLICY IF EXISTS "org access"  ON marketing_sends;
CREATE POLICY "org access" ON marketing_sends FOR ALL
  USING (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());

-- marketing_sender_warmup (criada em 0026) tinha a mesma falha: "team access
-- warmup" permitia a qualquer membro de qualquer org ver/alterar os contadores
-- de warmup de TODOS. É keyed por user_id (sem organization_id), por isso
-- escopa-se via user_id → team_members.organization_id. As funções
-- marketing_check_warmup_limit / marketing_record_send são SECURITY DEFINER e
-- continuam a funcionar (ignoram RLS).
DROP POLICY IF EXISTS "team access warmup" ON marketing_sender_warmup;
DROP POLICY IF EXISTS "org access warmup"  ON marketing_sender_warmup;
CREATE POLICY "org access warmup" ON marketing_sender_warmup FOR ALL
  USING (
    user_id IN (SELECT auth_user_id FROM team_members WHERE organization_id = get_user_org_id())
  )
  WITH CHECK (
    user_id IN (SELECT auth_user_id FROM team_members WHERE organization_id = get_user_org_id())
  );
