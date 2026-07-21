-- Quic Platform: fecha corridas de concorrencia no webhook Stripe (0045)
-- Segue o padrao de 0040-0044: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).
--
-- Contexto: o webhook /api/webhooks/stripe fazia um SELECT (idempotencia) seguido
-- de um INSERT sem garantia de unicidade a nivel de BD. O Stripe entrega webhooks
-- "at-least-once", nao "exactly-once" — duas entregas concorrentes para a mesma
-- sessao podiam ambas passar o SELECT antes de qualquer uma inserir, duplicando
-- bilhetes. `stripe_checkout_session_id` e nullable (outros caminhos de criacao de
-- bilhetes podem nao o preencher), por isso usamos um indice unico parcial em vez
-- de um constraint UNIQUE simples, para nao colidir varios NULLs.
CREATE UNIQUE INDEX tickets_stripe_checkout_session_id_unique
  ON tickets (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

-- Contexto: `quantity_sold` era atualizado com um read-modify-write nao atomico
-- (fetch do valor, depois UPDATE quantity_sold = valor_lido + delta), o que perde
-- incrementos sob compras concorrentes do mesmo tipo de bilhete. Segue o padrao
-- de 0029 (claim_notification_jobs): funcao SECURITY DEFINER que faz o incremento
-- atomicamente na propria instrucao SQL.
CREATE OR REPLACE FUNCTION increment_ticket_type_sold(p_ticket_type_id uuid, p_delta integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE ticket_types SET quantity_sold = quantity_sold + p_delta WHERE id = p_ticket_type_id;
$$;

REVOKE ALL ON FUNCTION increment_ticket_type_sold(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION increment_ticket_type_sold(uuid, integer) TO service_role;
