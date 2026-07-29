-- Quic Platform: push notifications no portal do cliente (0047)
-- Segue o padrao de 0040-0046: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).
--
-- Contexto: notification_jobs.channel aceitava 'portal' mas o worker nunca
-- enviava nada nesse canal (era so um placeholder). Este trabalho adiciona
-- push real como canal irmao do email/sms, entregue via Expo Push API.
-- client_push_tokens e uma tabela separada (nao uma coluna em clients)
-- porque um cliente pode ter a app instalada em varios dispositivos.

ALTER TABLE notification_jobs DROP CONSTRAINT notification_jobs_channel_check;
ALTER TABLE notification_jobs ADD CONSTRAINT notification_jobs_channel_check
  CHECK (channel IN ('email', 'whatsapp', 'sms', 'portal', 'push'));

CREATE TABLE client_push_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token       text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (client_id, token)
);

ALTER TABLE client_push_tokens ENABLE ROW LEVEL SECURITY;

-- Só o service role (usado pela rota API de registo e pelo worker) escreve/lê
-- esta tabela. O cliente não acede a ela diretamente via Supabase client —
-- o registo do token passa sempre pela rota API autenticada (Task 3), nunca
-- por um insert direto do dispositivo.
CREATE POLICY "service role full access to client_push_tokens" ON client_push_tokens
  FOR ALL TO service_role USING (true) WITH CHECK (true);
