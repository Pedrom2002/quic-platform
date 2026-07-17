-- Quic Platform: liga artistas a contas Supabase Auth (0041_artists_auth_user)
-- Segue o padrão de 0040: aplicar manualmente via SQL Editor / Management API.
-- NÃO usar `supabase db push` (histórico de migrações partilhado com Stock-Plat).

ALTER TABLE artists ADD COLUMN auth_user_id uuid REFERENCES auth.users(id);
CREATE UNIQUE INDEX idx_artists_auth_user_id ON artists(auth_user_id) WHERE auth_user_id IS NOT NULL;

CREATE POLICY "artist_read_own_artist" ON artists
  FOR SELECT USING (auth_user_id = auth.uid());
