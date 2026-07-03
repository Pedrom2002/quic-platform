-- Add RGPD consent timestamp to portugal_registrations.
-- Records when the user accepted data storage + communications consent.

ALTER TABLE portugal_registrations
  ADD COLUMN IF NOT EXISTS consent_at timestamptz;
