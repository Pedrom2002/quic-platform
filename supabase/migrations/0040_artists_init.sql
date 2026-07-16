-- Quic Platform: portal de artistas agenciados (0040_artists_init)
-- ATENÇÃO: projeto Supabase partilhado (quic-plat + Stock-Plat). Esta migração
-- APENAS cria objetos novos prefixados artist* e nunca altera nem remove
-- objetos existentes.
--
-- Aplicar MANUALMENTE via SQL Editor / Management API. NÃO usar
-- `supabase db push` (o histórico de migrações é partilhado e o push não é
-- utilizável neste projeto). Ver README para contexto sobre a BD partilhada.
--
-- A função get_user_org_id() já existe (criada em 0002_rls_policies.sql);
-- não é recriada aqui.

-- =========================================================
-- ARTISTS
-- =========================================================
CREATE TABLE artists (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                    text NOT NULL,
  photo_url               text,
  bio                     text,
  email                   text,
  phone                   text,
  portal_token            text UNIQUE,
  portal_token_expires_at timestamptz,
  notify_on_publish       boolean NOT NULL DEFAULT true,
  is_active               boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_artists_org ON artists(organization_id);

-- =========================================================
-- ARTIST AGENDA ITEMS
-- =========================================================
CREATE TABLE artist_agenda_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('show', 'ensaio', 'entrevista', 'viagem', 'gravacao', 'outro')),
  title           text NOT NULL,
  starts_at       timestamptz NOT NULL,
  ends_at         timestamptz,
  location        text,
  notes           text,
  event_id        uuid REFERENCES events(id) ON DELETE SET NULL,
  is_visible      boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_artist_agenda_items_artist ON artist_agenda_items(artist_id);
CREATE INDEX idx_artist_agenda_items_org ON artist_agenda_items(organization_id);
CREATE INDEX idx_artist_agenda_items_starts_at ON artist_agenda_items(starts_at);

-- =========================================================
-- ARTIST CLIPPINGS
-- =========================================================
CREATE TABLE artist_clippings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           text NOT NULL,
  source          text,
  url             text NOT NULL,
  image_url       text,
  published_at    date,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_artist_clippings_artist ON artist_clippings(artist_id);
CREATE INDEX idx_artist_clippings_org ON artist_clippings(organization_id);

-- =========================================================
-- ARTIST ASSETS (conteúdos digitais + documentos, separados por section)
-- =========================================================
CREATE TABLE artist_assets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  section         text NOT NULL CHECK (section IN ('content', 'document')),
  kind            text NOT NULL CHECK (kind IN ('foto', 'video', 'arte', 'contrato', 'rider', 'epk', 'fatura', 'outro')),
  title           text NOT NULL,
  blob_url        text,
  external_url    text,
  thumbnail_url   text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT artist_assets_one_url CHECK (num_nonnulls(blob_url, external_url) = 1)
);
CREATE INDEX idx_artist_assets_artist ON artist_assets(artist_id);
CREATE INDEX idx_artist_assets_org ON artist_assets(organization_id);

-- =========================================================
-- RLS: dashboard via membros da organização (get_user_org_id() já existe).
-- Portal: sem policy pública; leitura server-side com service role após
-- validar o portal_token (mesmo padrão de lib/portal/data.ts).
-- =========================================================
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read_own_org_artists"   ON artists FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "members_insert_own_org_artists" ON artists FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_update_own_org_artists" ON artists FOR UPDATE USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_delete_own_org_artists" ON artists FOR DELETE USING (organization_id = get_user_org_id());

ALTER TABLE artist_agenda_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read_own_org_artist_agenda"   ON artist_agenda_items FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "members_insert_own_org_artist_agenda" ON artist_agenda_items FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_update_own_org_artist_agenda" ON artist_agenda_items FOR UPDATE USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_delete_own_org_artist_agenda" ON artist_agenda_items FOR DELETE USING (organization_id = get_user_org_id());

ALTER TABLE artist_clippings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read_own_org_artist_clippings"   ON artist_clippings FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "members_insert_own_org_artist_clippings" ON artist_clippings FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_update_own_org_artist_clippings" ON artist_clippings FOR UPDATE USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_delete_own_org_artist_clippings" ON artist_clippings FOR DELETE USING (organization_id = get_user_org_id());

ALTER TABLE artist_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read_own_org_artist_assets"   ON artist_assets FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "members_insert_own_org_artist_assets" ON artist_assets FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_update_own_org_artist_assets" ON artist_assets FOR UPDATE USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "members_delete_own_org_artist_assets" ON artist_assets FOR DELETE USING (organization_id = get_user_org_id());
