-- Multi-pixel forensics: detect bot opens (Apple/Gmail proxy)
-- Top pixel + bottom pixel. Real user reads top → scrolls → bottom (delay).
-- Bot pre-fetches both within milliseconds.

ALTER TABLE marketing_sends
  ADD COLUMN IF NOT EXISTS pixel_top_at timestamptz,
  ADD COLUMN IF NOT EXISTS pixel_bottom_at timestamptz,
  ADD COLUMN IF NOT EXISTS bot_suspected boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN marketing_sends.pixel_top_at IS 'When top pixel loaded (usually first contact)';
COMMENT ON COLUMN marketing_sends.pixel_bottom_at IS 'When bottom pixel loaded (real user scroll)';
COMMENT ON COLUMN marketing_sends.bot_suspected IS 'True if pixels loaded near-simultaneously → Apple/Gmail proxy';
