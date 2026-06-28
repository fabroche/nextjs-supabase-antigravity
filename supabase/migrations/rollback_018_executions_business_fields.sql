-- Rollback Migration 018: quita chat_id + is_out_of_hours de n8n_executions

DROP INDEX IF EXISTS public.idx_n8n_executions_chat_id;

ALTER TABLE public.n8n_executions
  DROP COLUMN IF EXISTS chat_id,
  DROP COLUMN IF EXISTS is_out_of_hours;
