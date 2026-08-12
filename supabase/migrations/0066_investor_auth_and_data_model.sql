-- Quic Platform: fundacao da area de investidores — auth + modelo de dados (0066)
-- Segue o padrao de 0040-0065: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).
--
-- Contexto: primeiro sub-projeto da area "Golden Circle" pos-login para
-- investidores (dashboard, opportunities, portfolio, documentos, insights,
-- KYC). Este migration so cria a fundacao (tabelas + RLS); UI e painel
-- interno de gestao sao sub-projetos separados que seguem depois.
--
-- Investidores sao um tipo de conta novo e distinto de team_members (equipa
-- interna) e clientes (acesso por token, sem conta). Login por email+password
-- via Supabase Auth como team_members, mas registo publico fica com
-- status='pending' ate aprovacao manual por um team_member — nenhum acesso
-- a dados reais antes de status='approved'.
--
-- "Projeto de investimento" (investment_projects) e uma entidade nova,
-- deliberadamente independente da tabela `events` ja existente: `events` serve
-- gestao operacional de eventos de clientes (checklist, ficheiros, equipa),
-- um conceito totalmente diferente de "oportunidade de investimento em que um
-- investidor externo aplica capital".

CREATE TABLE investors (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id                uuid NOT NULL UNIQUE REFERENCES auth.users(id),
  organization_id             uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name                   text NOT NULL,
  email                       text NOT NULL,
  phone                       text,
  status                      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  approved_at                 timestamptz,
  approved_by_team_member_id  uuid REFERENCES team_members(id)
);
CREATE INDEX idx_investors_org ON investors(organization_id);
CREATE INDEX idx_investors_auth_user ON investors(auth_user_id);

CREATE TABLE investment_projects (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  description           text,
  status                text NOT NULL DEFAULT 'coming_soon' CHECK (status IN ('coming_soon', 'open', 'closed', 'completed')),
  funding_goal_cents    integer NOT NULL CHECK (funding_goal_cents >= 0),
  capacity              integer,
  investment_deadline   date,
  actual_revenue_cents  integer,
  attendance            integer,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_investment_projects_org ON investment_projects(organization_id);

CREATE TABLE investments (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id            uuid NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  project_id             uuid NOT NULL REFERENCES investment_projects(id) ON DELETE RESTRICT,
  amount_cents           integer NOT NULL CHECK (amount_cents > 0),
  invested_at            timestamptz NOT NULL DEFAULT now(),
  status                 text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'written_off')),
  projected_return_cents integer,
  realized_return_cents  integer
);
CREATE INDEX idx_investments_investor ON investments(investor_id);
CREATE INDEX idx_investments_project ON investments(project_id);

CREATE TABLE investor_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id  uuid REFERENCES investors(id) ON DELETE CASCADE,
  project_id   uuid REFERENCES investment_projects(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('contract', 'report', 'tax', 'presentation')),
  file_url     text NOT NULL,
  title        text NOT NULL,
  uploaded_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (investor_id IS NOT NULL OR project_id IS NOT NULL)
);
CREATE INDEX idx_investor_documents_investor ON investor_documents(investor_id);
CREATE INDEX idx_investor_documents_project ON investor_documents(project_id);

-- Helpers, seguindo o padrao ja estabelecido por get_user_org_id() (0002).
CREATE OR REPLACE FUNCTION get_investor_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM investors
  WHERE auth_user_id = auth.uid() AND status = 'approved'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION get_investor_id() FROM public;
GRANT EXECUTE ON FUNCTION get_investor_id() TO authenticated;

CREATE OR REPLACE FUNCTION get_investor_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id FROM investors
  WHERE auth_user_id = auth.uid() AND status = 'approved'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION get_investor_org_id() FROM public;
GRANT EXECUTE ON FUNCTION get_investor_org_id() TO authenticated;

-- RLS: investors
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "investor_sees_own_profile" ON investors
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "investor_updates_own_profile" ON investors
  FOR UPDATE USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid() AND status = (SELECT status FROM investors WHERE auth_user_id = auth.uid()));

CREATE POLICY "anyone_can_register" ON investors
  FOR INSERT WITH CHECK (auth_user_id = auth.uid() AND status = 'pending');

CREATE POLICY "team_manages_investors" ON investors
  FOR ALL USING (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());

-- RLS: investment_projects
ALTER TABLE investment_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approved_investors_see_projects" ON investment_projects
  FOR SELECT USING (organization_id = get_investor_org_id());

CREATE POLICY "team_manages_projects" ON investment_projects
  FOR ALL USING (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());

-- RLS: investments
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "investor_sees_own_investments" ON investments
  FOR SELECT USING (investor_id = get_investor_id());

CREATE POLICY "team_manages_investments" ON investments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM investors i
      WHERE i.id = investments.investor_id AND i.organization_id = get_user_org_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM investors i
      WHERE i.id = investments.investor_id AND i.organization_id = get_user_org_id()
    )
  );

-- RLS: investor_documents
ALTER TABLE investor_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "investor_sees_own_documents" ON investor_documents
  FOR SELECT USING (
    investor_id = get_investor_id()
    OR (
      project_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM investment_projects p
        WHERE p.id = investor_documents.project_id AND p.organization_id = get_investor_org_id()
      )
    )
  );

CREATE POLICY "team_manages_documents" ON investor_documents
  FOR ALL USING (
    (investor_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM investors i WHERE i.id = investor_documents.investor_id AND i.organization_id = get_user_org_id()
    ))
    OR
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM investment_projects p WHERE p.id = investor_documents.project_id AND p.organization_id = get_user_org_id()
    ))
  )
  WITH CHECK (
    (investor_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM investors i WHERE i.id = investor_documents.investor_id AND i.organization_id = get_user_org_id()
    ))
    OR
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM investment_projects p WHERE p.id = investor_documents.project_id AND p.organization_id = get_user_org_id()
    ))
  );
