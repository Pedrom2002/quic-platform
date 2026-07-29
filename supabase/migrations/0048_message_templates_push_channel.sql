-- Quic Platform: permite canal 'push' em message_templates (0048)
-- Segue o padrao de 0040-0047: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).
--
-- Contexto: a migracao 0047 adicionou 'push' ao CHECK de notification_jobs.channel,
-- mas message_templates tem o seu proprio CHECK separado que ficou esquecido -
-- sem esta migracao, e impossivel criar um template com channel='push', o que
-- bloqueia silenciosamente o canal push (o dispatcher simplesmente nao encontra
-- template e nao cria o job, sem erro visivel).

ALTER TABLE message_templates DROP CONSTRAINT message_templates_channel_check;
ALTER TABLE message_templates ADD CONSTRAINT message_templates_channel_check
  CHECK (channel IN ('email', 'whatsapp', 'sms', 'portal', 'push'));
