-- =========================================================
-- Quic Platform — remove marketing campaign follow-up feature
-- =========================================================
-- The automatic follow-up (re-send to contacts who did not open an email
-- after N days) has been removed from the app. Drop the columns that
-- backed it; the cron routes and dispatch logic were already removed.

ALTER TABLE marketing_campaigns
  DROP COLUMN IF EXISTS followup_enabled,
  DROP COLUMN IF EXISTS followup_days,
  DROP COLUMN IF EXISTS followup_subject,
  DROP COLUMN IF EXISTS followup_body,
  DROP COLUMN IF EXISTS followup_max;

ALTER TABLE marketing_sends
  DROP COLUMN IF EXISTS followup_count,
  DROP COLUMN IF EXISTS last_followup_at;
