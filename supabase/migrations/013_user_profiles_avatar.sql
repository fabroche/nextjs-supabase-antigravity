-- Migration 013: avatar_url on user_profiles
ALTER TABLE public.user_profiles ADD COLUMN avatar_url TEXT;

-- Rollback: see rollback_013_user_profiles_avatar.sql
