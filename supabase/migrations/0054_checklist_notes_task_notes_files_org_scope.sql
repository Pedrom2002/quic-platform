-- Quic Platform: checklist_item_notes, event_task_notes, event_task_files
-- passam a validar FK contra o evento na policy INSERT (0054)
-- Segue o padrao de 0040-0053: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).
--
-- Contexto: mesmo padrao do fix 0050 (checklist_item_files). As policies
-- "members_insert_cin" (0006), e as de event_task_notes/event_task_files (0007)
-- so validavam organization_id = get_user_org_id() na propria linha, sem
-- confirmar que checklist_item_id/task_id/event_file_id pertencem a um evento
-- dessa organizacao. Mitigado tambem a nivel de aplicacao (actions-notes.ts,
-- tasks/actions.ts), esta migration e a defesa de fundo.

DROP POLICY IF EXISTS "members_insert_cin" ON checklist_item_notes;
CREATE POLICY "members_insert_cin" ON checklist_item_notes FOR INSERT WITH CHECK (
  organization_id = get_user_org_id()
  AND EXISTS (
    SELECT 1 FROM event_checklist_items eci
    JOIN events e ON e.id = eci.event_id
    WHERE eci.id = checklist_item_notes.checklist_item_id
      AND e.organization_id = checklist_item_notes.organization_id
  )
);

DROP POLICY IF EXISTS "members_insert_etn" ON event_task_notes;
CREATE POLICY "members_insert_etn" ON event_task_notes FOR INSERT WITH CHECK (
  organization_id = get_user_org_id()
  AND EXISTS (
    SELECT 1 FROM event_tasks t
    WHERE t.id = event_task_notes.task_id
      AND t.organization_id = event_task_notes.organization_id
  )
);

DROP POLICY IF EXISTS "members_insert_etf" ON event_task_files;
CREATE POLICY "members_insert_etf" ON event_task_files FOR INSERT WITH CHECK (
  organization_id = get_user_org_id()
  AND EXISTS (
    SELECT 1 FROM event_tasks t
    WHERE t.id = event_task_files.task_id
      AND t.organization_id = event_task_files.organization_id
  )
  AND EXISTS (
    SELECT 1 FROM event_files ef
    WHERE ef.id = event_task_files.event_file_id
      AND ef.organization_id = event_task_files.organization_id
  )
);
