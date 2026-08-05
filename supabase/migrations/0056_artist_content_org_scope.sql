-- Quic Platform: artist_agenda_items/artist_clippings/artist_assets passam a
-- validar artist_id na policy INSERT (0056)
-- Segue o padrao de 0040-0055: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).
--
-- Contexto: content-actions.ts (createAgendaItem/createClipping/createAsset) ja
-- valida ownership via getOwnedArtist antes do insert - protegido a nivel de app.
-- O gap e so a RLS (0040), que so validava organization_id da propria linha,
-- permitindo ligar um item a artist_id de outra organizacao via bypass total da
-- Server Action (browser console com anon key, lib/supabase/client.ts).

DROP POLICY IF EXISTS "members_insert_own_org_artist_agenda" ON artist_agenda_items;
CREATE POLICY "members_insert_own_org_artist_agenda" ON artist_agenda_items FOR INSERT WITH CHECK (
  organization_id = get_user_org_id()
  AND EXISTS (
    SELECT 1 FROM artists a
    WHERE a.id = artist_agenda_items.artist_id
      AND a.organization_id = artist_agenda_items.organization_id
  )
);

DROP POLICY IF EXISTS "members_insert_own_org_artist_clippings" ON artist_clippings;
CREATE POLICY "members_insert_own_org_artist_clippings" ON artist_clippings FOR INSERT WITH CHECK (
  organization_id = get_user_org_id()
  AND EXISTS (
    SELECT 1 FROM artists a
    WHERE a.id = artist_clippings.artist_id
      AND a.organization_id = artist_clippings.organization_id
  )
);

DROP POLICY IF EXISTS "members_insert_own_org_artist_assets" ON artist_assets;
CREATE POLICY "members_insert_own_org_artist_assets" ON artist_assets FOR INSERT WITH CHECK (
  organization_id = get_user_org_id()
  AND EXISTS (
    SELECT 1 FROM artists a
    WHERE a.id = artist_assets.artist_id
      AND a.organization_id = artist_assets.organization_id
  )
);
