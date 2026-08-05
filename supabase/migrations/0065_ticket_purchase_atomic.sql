-- Quic Platform: fecha TOCTOU na compra de bilhetes via webhook Stripe (0065)
-- Segue o padrao de 0040-0064: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).
--
-- Contexto: o webhook /api/webhooks/stripe fazia INSERT dos N bilhetes e so DEPOIS
-- chamava increment_ticket_type_sold. O CHECK (quantity_sold <= quantity_total) em
-- ticket_types protege a coluna quantity_sold, mas nao protege a contagem real de
-- linhas em `tickets`: se duas entregas concorrentes do mesmo ticket_type passarem
-- ambas pelo pre-check de idempotencia antes de qualquer incremento acontecer, ambas
-- podem inserir bilhetes alem da capacidade, e so o incremento (que corre depois, e
-- cujo erro e apenas logado, nunca reverte o insert) e que eventualmente rejeitaria
-- o excesso, ja tarde demais.
--
-- Fix: uma unica funcao SECURITY DEFINER que faz o SELECT ... FOR UPDATE do
-- ticket_type (serializando concorrentes no mesmo id), verifica capacidade,
-- insere os bilhetes e incrementa quantity_sold, tudo na mesma transacao
-- implicita da funcao. Se a capacidade for insuficiente, a funcao devolve erro e
-- nada e escrito (nem tickets nem quantity_sold).
CREATE OR REPLACE FUNCTION purchase_tickets(
  p_ticket_type_id uuid,
  p_quantity integer,
  p_buyer_auth_user_id uuid,
  p_stripe_checkout_session_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_type ticket_types;
  v_existing_count integer;
BEGIN
  IF p_quantity < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantidade invalida');
  END IF;

  SELECT count(*) INTO v_existing_count
  FROM tickets
  WHERE stripe_checkout_session_id = p_stripe_checkout_session_id;
  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object('success', true, 'note', 'ja processado');
  END IF;

  SELECT * INTO v_ticket_type
  FROM ticket_types
  WHERE id = p_ticket_type_id
  FOR UPDATE;

  IF v_ticket_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tipo de bilhete nao encontrado');
  END IF;

  IF v_ticket_type.quantity_sold + p_quantity > v_ticket_type.quantity_total THEN
    RETURN jsonb_build_object('success', false, 'error', 'Capacidade esgotada');
  END IF;

  INSERT INTO tickets (ticket_type_id, event_id, organization_id, buyer_auth_user_id, stripe_checkout_session_id)
  SELECT v_ticket_type.id, v_ticket_type.event_id, v_ticket_type.organization_id,
         p_buyer_auth_user_id, p_stripe_checkout_session_id
  FROM generate_series(1, p_quantity);

  UPDATE ticket_types SET quantity_sold = quantity_sold + p_quantity WHERE id = v_ticket_type.id;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', true, 'note', 'ja processado');
END;
$$;

REVOKE ALL ON FUNCTION purchase_tickets(uuid, integer, uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION purchase_tickets(uuid, integer, uuid, text) TO service_role;
