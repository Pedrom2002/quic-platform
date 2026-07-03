-- Portugal Campaign: registos publicos e vencedores de sorteio

CREATE TABLE portugal_registrations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text UNIQUE NOT NULL,
  phone      text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE portugal_winners (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES portugal_registrations(id),
  qr_token        text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  sms_sent_at     timestamptz,
  redeemed_at     timestamptz,
  drawn_at        timestamptz DEFAULT now()
);

CREATE INDEX idx_portugal_winners_token ON portugal_winners(qr_token);
CREATE INDEX idx_portugal_winners_registration ON portugal_winners(registration_id);

-- RLS: registos publicos so permitem INSERT anonimo
ALTER TABLE portugal_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public insert registrations"
  ON portugal_registrations FOR INSERT
  TO anon
  WITH CHECK (true);

-- RLS: winners completamente fechado (so service role acede)
ALTER TABLE portugal_winners ENABLE ROW LEVEL SECURITY;
