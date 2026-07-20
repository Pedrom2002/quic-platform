-- Quic Platform: leitura propria do artista nos dados do portal (0043_artist_portal_self_read)
-- Segue o padrao de 0040/0041/0042: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).
-- Policies aditivas: nao tocam nas policies de equipa ja existentes (organization_id).

CREATE POLICY "artist_read_own_agenda" ON artist_agenda_items
  FOR SELECT USING (artist_id IN (SELECT id FROM artists WHERE auth_user_id = auth.uid()));

CREATE POLICY "artist_read_own_clippings" ON artist_clippings
  FOR SELECT USING (artist_id IN (SELECT id FROM artists WHERE auth_user_id = auth.uid()));

CREATE POLICY "artist_read_own_assets" ON artist_assets
  FOR SELECT USING (artist_id IN (SELECT id FROM artists WHERE auth_user_id = auth.uid()));
