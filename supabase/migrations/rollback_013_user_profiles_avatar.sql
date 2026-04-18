-- Rollback for migration 013
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS avatar_url;
