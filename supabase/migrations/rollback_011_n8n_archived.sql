-- Rollback for migration 011
DROP INDEX IF EXISTS idx_n8n_instances_archived;
ALTER TABLE public.n8n_instances DROP COLUMN IF EXISTS archived_at;
