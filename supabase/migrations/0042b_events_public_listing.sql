-- Quic Platform: eventos publicaveis no feed do app mobile (0042b_events_public_listing)
-- Renomeada de 0042 para 0042b: colidia com 0042_client_update_sms_portal_templates.sql
-- (ambas numeradas 0042, aplicadas em producao antes da colisao ser detetada).
-- Ja aplicada em producao com o nome antigo; renomear o ficheiro no repo nao
-- reaplica nada, so evita a colisao de nomes daqui para a frente.
-- Segue o padrao de 0040/0041: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).

ALTER TABLE events ADD COLUMN cover_image_url text;
ALTER TABLE events ADD COLUMN is_public_listed boolean NOT NULL DEFAULT false;

CREATE POLICY "public_read_listed_events" ON events
  FOR SELECT USING (is_public_listed = true);
