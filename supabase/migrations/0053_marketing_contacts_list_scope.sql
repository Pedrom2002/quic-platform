-- Quic Platform: marketing_contacts INSERT/UPDATE passa a validar list_id (0053)
-- Segue o padrao de 0040-0052: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).
--
-- Contexto: a policy "org access" (0028) so validava organization_id = get_user_org_id()
-- na propria linha, sem confirmar que list_id resolve para uma marketing_lists da
-- mesma organizacao. Um membro de qualquer organizacao podia inserir um contacto
-- (via addContact, ja corrigido em app/dashboard/marketing/contacts/actions.ts, ou
-- via browser console directo com anon key) apontando para uma lista de OUTRA
-- organizacao. Quando essa lista fosse usada numa campanha, o conteudo/oferta da
-- campanha de outra organizacao seria enviado para o email injectado pelo atacante.

DROP POLICY IF EXISTS "org access" ON marketing_contacts;
CREATE POLICY "org access" ON marketing_contacts FOR ALL
  USING (organization_id = get_user_org_id())
  WITH CHECK (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM marketing_lists l
      WHERE l.id = marketing_contacts.list_id
        AND l.organization_id = marketing_contacts.organization_id
    )
  );
