-- Rollback for migration 012
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS ui_preferences;
DROP TABLE IF EXISTS public.metric_definitions;
