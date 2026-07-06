-- Goalfest: registos publicos de captura de leads (sem sorteio/SMS).

CREATE TABLE goalfest_registrations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text UNIQUE NOT NULL,
  phone      text UNIQUE NOT NULL,
  consent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS: INSERT publico, tudo o resto bloqueado explicitamente.
ALTER TABLE goalfest_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can insert goalfest registrations"
  ON goalfest_registrations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "block select goalfest registrations"
  ON goalfest_registrations FOR SELECT
  USING (false);

CREATE POLICY "block update goalfest registrations"
  ON goalfest_registrations FOR UPDATE
  USING (false);

CREATE POLICY "block delete goalfest registrations"
  ON goalfest_registrations FOR DELETE
  USING (false);
