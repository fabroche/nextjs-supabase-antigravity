-- 007_activity_severity.sql
-- Adds severity column to activity_feed for color-coding service events
-- (deploys, builds, workflows). Telegram messages use NULL (neutral).

ALTER TABLE activity_feed
ADD COLUMN severity TEXT CHECK (severity IN ('success', 'warning', 'error'));

COMMENT ON COLUMN activity_feed.severity IS 'Event severity for UI color-coding: success (green), warning (yellow), error (red), NULL (neutral/informational)';
