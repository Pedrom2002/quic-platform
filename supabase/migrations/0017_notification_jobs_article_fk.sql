-- =========================================================
-- Quic Platform - Tie notification_jobs to event_articles
-- =========================================================
ALTER TABLE notification_jobs
  ADD COLUMN event_article_id uuid REFERENCES event_articles(id) ON DELETE SET NULL;

CREATE INDEX idx_notification_jobs_article
  ON notification_jobs(event_article_id)
  WHERE event_article_id IS NOT NULL;
