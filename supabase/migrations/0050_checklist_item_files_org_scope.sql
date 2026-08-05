-- Quic Platform: checklist_item_files INSERT policy passa a validar que
-- checklist_item_id pertence a um evento da mesma organizacao (0050)
-- Segue o padrao de 0040-0049: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).
--
-- Contexto: a policy "members_insert_cif" so validava organization_id = get_user_org_id()
-- na propria linha inserida, sem confirmar que checklist_item_id resolve para um
-- event_checklist_items cujo evento pertence a essa organizacao. Um membro de
-- qualquer organizacao podia inserir uma linha em checklist_item_files apontando
-- para um checklist_item_id de OUTRA organizacao (se conhecesse/adivinhasse o id),
-- injetando um ficheiro (event_file_id) arbitrario no checklist de outra org -
-- visivel depois no portal publico do cliente dessa org.
-- Mitigado tambem a nivel de aplicacao em actions-files.ts (linkFileToItemAction /
-- uploadFileToItemAction), esta policy e a defesa de fundo (defense in depth).

DROP POLICY IF EXISTS "members_insert_cif" ON checklist_item_files;
CREATE POLICY "members_insert_cif" ON checklist_item_files FOR INSERT WITH CHECK (
  organization_id = get_user_org_id()
  AND EXISTS (
    SELECT 1 FROM event_checklist_items eci
    JOIN events e ON e.id = eci.event_id
    WHERE eci.id = checklist_item_files.checklist_item_id
      AND e.organization_id = checklist_item_files.organization_id
  )
  AND EXISTS (
    SELECT 1 FROM event_files ef
    WHERE ef.id = checklist_item_files.event_file_id
      AND ef.organization_id = checklist_item_files.organization_id
  )
);
