-- Migration 011: soft-delete for n8n_instances via archived_at
-- RLS admin policy already exists from migration 008 — no new policy needed.

ALTER TABLE public.n8n_instances ADD COLUMN archived_at TIMESTAMPTZ;

CREATE INDEX idx_n8n_instances_archived
  ON public.n8n_instances(archived_at)
  WHERE archived_at IS NOT NULL;

-- Rollback: see 011_n8n_archived_rollback.sql
