-- =========================================================
-- Quic Platform — Claim atómico de notification_jobs
-- =========================================================
-- O cron /api/cron/process-scheduled fazia SELECT dos jobs `queued` e só depois
-- os publicava no QStash. Duas execuções sobrepostas (cron + trigger manual)
-- podiam selecionar e publicar o mesmo job duas vezes → email duplicado.
--
-- Esta migration adiciona o estado `processing` e uma função que reclama um
-- lote de forma atómica com FOR UPDATE SKIP LOCKED, garantindo que cada job é
-- entregue a no máximo uma execução.
-- =========================================================

-- Novo estado intermédio entre `queued` e `delivered`/`failed`
ALTER TABLE notification_jobs DROP CONSTRAINT IF EXISTS notification_jobs_status_check;
ALTER TABLE notification_jobs
  ADD CONSTRAINT notification_jobs_status_check
  CHECK (status IN ('queued', 'processing', 'sent', 'delivered', 'failed', 'cancelled'));

-- Reclama atomicamente até p_batch_size jobs prontos a enviar.
-- FOR UPDATE SKIP LOCKED → execuções concorrentes nunca reclamam o mesmo job.
CREATE OR REPLACE FUNCTION claim_notification_jobs(p_batch_size integer)
RETURNS TABLE (
  id uuid,
  event_id uuid,
  client_id uuid,
  channel text,
  rendered_subject text,
  rendered_body text
)
LANGUAGE sql AS $$
  UPDATE notification_jobs nj
  SET status = 'processing', updated_at = now()
  WHERE nj.id IN (
    SELECT j.id FROM notification_jobs j
    WHERE j.status = 'queued'
      AND j.qstash_message_id IS NULL
      AND j.scheduled_at <= now()
    ORDER BY j.scheduled_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING nj.id, nj.event_id, nj.client_id, nj.channel, nj.rendered_subject, nj.rendered_body;
$$;
