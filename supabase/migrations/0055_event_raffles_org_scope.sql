-- Quic Platform: event_raffles/event_raffle_entries passam a validar FK (0055)
-- Segue o padrao de 0040-0054: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).
--
-- Contexto: policies INSERT/UPDATE de event_raffles e event_raffle_entries (0019)
-- so validavam organization_id = get_user_org_id() na propria linha. createRaffleAction
-- nunca validava eventId (corrigido em sorteios/actions.ts); addEntryAction/
-- addEntriesBulkAction nunca validavam raffleId. Mesmo padrao do fix 0050.

DROP POLICY IF EXISTS "members_insert_er" ON event_raffles;
CREATE POLICY "members_insert_er" ON event_raffles FOR INSERT WITH CHECK (
  organization_id = get_user_org_id()
  AND EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_raffles.event_id
      AND e.organization_id = event_raffles.organization_id
  )
);

DROP POLICY IF EXISTS "members_insert_ere" ON event_raffle_entries;
CREATE POLICY "members_insert_ere" ON event_raffle_entries FOR INSERT WITH CHECK (
  organization_id = get_user_org_id()
  AND EXISTS (
    SELECT 1 FROM event_raffles r
    WHERE r.id = event_raffle_entries.raffle_id
      AND r.organization_id = event_raffle_entries.organization_id
  )
);
