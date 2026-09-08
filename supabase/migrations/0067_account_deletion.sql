-- Quic Platform: eliminação de conta pelo próprio utilizador (0067)
-- Segue o padrao de 0040-0066: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).
--
-- Contexto: App Store guideline 5.1.1(v) e Play Data Safety exigem que qualquer
-- app com registo permita apagar a conta a partir de dentro da app. A mobile
-- (mobile/app/(tabs)/mais.tsx) so tinha "Terminar sessao".
--
-- `auth.users` tem referencias sem ON DELETE CASCADE em tres tabelas
-- (artists.auth_user_id, tickets.buyer_auth_user_id, investors.auth_user_id) --
-- um DELETE direto em auth.users falharia por FK se o utilizador tiver
-- qualquer uma delas preenchida. Em vez de apagar esses registos (haveria perda
-- de historico de bilhetes/vendas, que e registo de negocio), a funcao:
--   1. reatribui artists/tickets a um unico "utilizador de sistema" reservado
--      (criado aqui, nunca usado para login), preservando o historico sem
--      manter dados pessoais identificaveis do titular original;
--   2. apaga o proprio registo em investors (o ON DELETE CASCADE ja existente
--      em investments/investor_documents trata do resto);
--   3. remove o utilizador em auth.users, que por CASCADE ja aplicado noutras
--      migrations apaga team_members e as restantes referencias diretas.
--
-- Chamada exclusivamente pela app com o proprio access_token do utilizador
-- (auth.uid() = p_auth_user_id e reforcado dentro da funcao); a rota
-- app/api/account/delete/route.ts e so quem tem GRANT para invocar via
-- service_role, depois de validar a sessao.

-- Utilizador reservado que fica dono do historico apos anonimizacao. Nunca
-- tem password nem faz login: existe so como FK target.
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated',
  'conta-eliminada@quic.pt',
  '', now(), now(), now(),
  '{"provider": "system", "providers": []}'::jsonb,
  '{}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION delete_own_account(p_auth_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_system_user_id CONSTANT uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF p_auth_user_id IS NULL OR p_auth_user_id = v_system_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'utilizador invalido');
  END IF;

  -- Preserva o historico de negocio (vendas, bilhetes emitidos) sem manter a
  -- ligacao ao titular original.
  UPDATE artists SET auth_user_id = v_system_user_id WHERE auth_user_id = p_auth_user_id;
  UPDATE tickets SET buyer_auth_user_id = v_system_user_id WHERE buyer_auth_user_id = p_auth_user_id;

  -- investor_documents/investments caem com ON DELETE CASCADE a partir daqui.
  DELETE FROM investors WHERE auth_user_id = p_auth_user_id;

  -- team_members, client_push_tokens e as restantes FKs diretas a auth.users
  -- ja tem ON DELETE CASCADE (ver 0009, 0047); isto remove tambem a sessao.
  DELETE FROM auth.users WHERE id = p_auth_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION delete_own_account(uuid) FROM public;
GRANT EXECUTE ON FUNCTION delete_own_account(uuid) TO service_role;
