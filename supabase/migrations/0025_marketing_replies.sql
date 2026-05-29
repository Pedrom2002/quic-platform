-- Reply tracking: detect when contacts reply to campaign emails via IMAP.
-- Store message_id of outgoing email + detect via In-Reply-To/References headers.

ALTER TABLE marketing_sends
  ADD COLUMN IF NOT EXISTS message_id text,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS reply_snippet text;

CREATE INDEX IF NOT EXISTS idx_marketing_sends_message_id ON marketing_sends(message_id) WHERE message_id IS NOT NULL;

-- Add 'replied' to send status enum
ALTER TYPE marketing_send_status ADD VALUE IF NOT EXISTS 'replied';

COMMENT ON COLUMN marketing_sends.message_id IS 'RFC 5322 Message-ID of the sent email (for reply matching)';
COMMENT ON COLUMN marketing_sends.replied_at IS 'Timestamp when contact replied (detected via IMAP)';
COMMENT ON COLUMN marketing_sends.reply_snippet IS 'First 200 chars of reply body (preview)';
