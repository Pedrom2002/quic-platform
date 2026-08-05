-- Quic Platform: adiciona completed_at a event_tasks (0051)
-- Segue o padrao de 0040-0050: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).
--
-- Contexto: event_checklist_items ja tem completed_at, preenchido quando o item
-- passa a status='completed' (ver app/api/events/[eventId]/checklist-items/[itemId]/route.ts:35).
-- event_tasks (0007_event_tasks.sql) tem o mesmo enum de status ('pending',
-- 'in_progress','completed','skipped') mas nunca ganhou a coluna equivalente,
-- pelo que updateTaskAction nao conseguia registar quando uma tarefa foi concluida.

ALTER TABLE event_tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;
