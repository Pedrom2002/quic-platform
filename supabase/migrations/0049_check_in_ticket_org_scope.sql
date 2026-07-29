-- Quic Platform: check_in_ticket passa a validar organizacao do chamador (0049)
-- Segue o padrao de 0040-0048: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).
--
-- Contexto: check_in_ticket(qr_code) procurava o bilhete so pelo qr_code, sem
-- confirmar que o staff autenticado pertence a mesma organizacao do bilhete.
-- Qualquer staff activo de qualquer organizacao na plataforma conseguia validar
-- (marcar 'used') um bilhete de um evento de outro organizador, se conhecesse
-- o qr_code. tickets.organization_id ja existe como coluna directa (sem join
-- necessario) - so faltava comparar com a organizacao do team_member chamador.
-- Tambem passa a exigir is_active=true no team_member (staff desactivado nao
-- deve conseguir validar bilhetes).

CREATE OR REPLACE FUNCTION check_in_ticket(p_qr_code uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket tickets;
  v_caller_org uuid;
BEGIN
  SELECT organization_id INTO v_caller_org
  FROM team_members
  WHERE auth_user_id = auth.uid() AND is_active = true;

  IF v_caller_org IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autorizado');
  END IF;

  SELECT * INTO v_ticket FROM tickets WHERE qr_code = p_qr_code;

  IF v_ticket IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bilhete não encontrado');
  END IF;

  IF v_ticket.organization_id != v_caller_org THEN
    -- Mesma resposta que "não encontrado": não confirma a um staff de outra
    -- organização que o qr_code é válido noutro lado.
    RETURN jsonb_build_object('success', false, 'error', 'Bilhete não encontrado');
  END IF;

  IF v_ticket.status = 'used' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bilhete já validado', 'used_at', v_ticket.used_at);
  END IF;

  IF v_ticket.status = 'refunded' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bilhete reembolsado');
  END IF;

  UPDATE tickets
  SET status = 'used', used_at = now(),
      used_by_team_member_id = (SELECT id FROM team_members WHERE auth_user_id = auth.uid())
  WHERE id = v_ticket.id;

  RETURN jsonb_build_object('success', true);
END;
$$;
