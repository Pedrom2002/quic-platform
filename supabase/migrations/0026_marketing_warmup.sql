-- SMTP warmup: track daily sends per sender for gradual ramp-up.
-- Cold senders limited to low volume; ramp up over 14 days.

CREATE TABLE IF NOT EXISTS marketing_sender_warmup (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_send_at timestamptz NOT NULL DEFAULT now(),
  total_sent   integer NOT NULL DEFAULT 0,
  daily_sent   integer NOT NULL DEFAULT 0,
  last_send_at timestamptz
);

ALTER TABLE marketing_sender_warmup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team access warmup" ON marketing_sender_warmup FOR ALL USING (
  EXISTS (SELECT 1 FROM team_members WHERE auth_user_id = auth.uid())
);

-- Reset daily counter at UTC midnight
CREATE OR REPLACE FUNCTION marketing_check_warmup_limit(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row    marketing_sender_warmup;
  v_days   integer;
  v_limit  integer;
BEGIN
  SELECT * INTO v_row FROM marketing_sender_warmup WHERE user_id = p_user_id;

  IF v_row IS NULL THEN
    INSERT INTO marketing_sender_warmup (user_id) VALUES (p_user_id);
    RETURN jsonb_build_object('allowed', true, 'daily_limit', 50, 'sent_today', 0);
  END IF;

  -- Reset daily counter if last send was on a different UTC day
  IF v_row.last_send_at IS NOT NULL AND
     date_trunc('day', v_row.last_send_at AT TIME ZONE 'UTC') <
     date_trunc('day', now() AT TIME ZONE 'UTC') THEN
    UPDATE marketing_sender_warmup SET daily_sent = 0 WHERE user_id = p_user_id;
    v_row.daily_sent := 0;
  END IF;

  v_days := EXTRACT(DAY FROM now() - v_row.first_send_at)::integer;

  -- Gradual ramp: 50 → 100 → 200 → 400 → 800 → 2000 over ~14 days
  v_limit := CASE
    WHEN v_days < 1 THEN 50
    WHEN v_days < 3 THEN 100
    WHEN v_days < 5 THEN 200
    WHEN v_days < 7 THEN 400
    WHEN v_days < 10 THEN 800
    WHEN v_days < 14 THEN 1500
    ELSE 2000
  END;

  RETURN jsonb_build_object(
    'allowed', v_row.daily_sent < v_limit,
    'daily_limit', v_limit,
    'sent_today', v_row.daily_sent
  );
END;
$$;

CREATE OR REPLACE FUNCTION marketing_record_send(p_user_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO marketing_sender_warmup (user_id, total_sent, daily_sent, last_send_at)
  VALUES (p_user_id, 1, 1, now())
  ON CONFLICT (user_id) DO UPDATE
    SET total_sent = marketing_sender_warmup.total_sent + 1,
        daily_sent = marketing_sender_warmup.daily_sent + 1,
        last_send_at = now();
$$;
