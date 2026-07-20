-- Quic Platform: nucleo de bilheteira propria (0044_quic_tickets_core)
-- Segue o padrao de 0040-0043: aplicar manualmente via SQL Editor / Management API.
-- NAO usar `supabase db push` (historico de migracoes partilhado com Stock-Plat).

CREATE TABLE ticket_types (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  price_cents     integer NOT NULL CHECK (price_cents >= 0),
  currency        text NOT NULL DEFAULT 'eur',
  quantity_total  integer NOT NULL CHECK (quantity_total >= 0),
  quantity_sold   integer NOT NULL DEFAULT 0 CHECK (quantity_sold >= 0),
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (quantity_sold <= quantity_total)
);
CREATE INDEX idx_ticket_types_event ON ticket_types(event_id);

CREATE TABLE tickets (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type_id             uuid NOT NULL REFERENCES ticket_types(id) ON DELETE RESTRICT,
  event_id                   uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  buyer_auth_user_id         uuid NOT NULL REFERENCES auth.users(id),
  qr_code                    uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status                     text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'refunded')),
  stripe_checkout_session_id text,
  used_at                    timestamptz,
  used_by_team_member_id     uuid REFERENCES team_members(id),
  created_at                 timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tickets_buyer ON tickets(buyer_auth_user_id);
CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_qr ON tickets(qr_code);

ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_active_ticket_types" ON ticket_types
  FOR SELECT USING (is_active = true);
CREATE POLICY "members_manage_own_org_ticket_types" ON ticket_types
  FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyer_read_own_tickets" ON tickets
  FOR SELECT USING (buyer_auth_user_id = auth.uid());
CREATE POLICY "members_read_own_org_tickets" ON tickets
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE OR REPLACE FUNCTION check_in_ticket(p_qr_code uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket tickets;
BEGIN
  SELECT * INTO v_ticket FROM tickets WHERE qr_code = p_qr_code;

  IF v_ticket IS NULL THEN
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

REVOKE ALL ON FUNCTION check_in_ticket(uuid) FROM public;
GRANT EXECUTE ON FUNCTION check_in_ticket(uuid) TO authenticated;
