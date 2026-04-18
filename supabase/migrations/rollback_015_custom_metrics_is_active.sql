-- Rollback migration 015
DROP FUNCTION IF EXISTS public.get_workflow_event_count(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);
ALTER TABLE public.custom_metrics DROP COLUMN IF EXISTS is_active;
