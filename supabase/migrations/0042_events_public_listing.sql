-- Quic Platform: eventos publicaveis no feed do app mobile (0042_events_public_listing)
-- Segue o padrao de 0040/0041: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).

ALTER TABLE events ADD COLUMN cover_image_url text;
ALTER TABLE events ADD COLUMN is_public_listed boolean NOT NULL DEFAULT false;

CREATE POLICY "public_read_listed_events" ON events
  FOR SELECT USING (is_public_listed = true);
