-- ============================================================
-- Migration 1: Foundation
-- Creates helper functions, user_profiles table, RLS policies,
-- and auto-profile trigger on auth.users
-- ============================================================

-- ==========================================
-- 1. Helper function: update_updated_at()
-- Generic trigger to auto-update updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 2. Table: user_profiles
-- Linked 1:1 to auth.users via same UUID
-- Must be created BEFORE is_admin() since
-- that function references this table
-- ==========================================
CREATE TABLE public.user_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  role       TEXT NOT NULL DEFAULT 'negocio' CHECK (role IN ('admin', 'negocio')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on changes
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ==========================================
-- 3. Helper function: is_admin()
-- SECURITY DEFINER to bypass RLS and avoid
-- circular policy evaluation.
-- Created AFTER user_profiles table exists.
-- ==========================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = (select auth.uid()) AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = '';

-- ==========================================
-- 4. RLS policies for user_profiles
-- ==========================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING ((select auth.uid()) = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles FOR SELECT
  USING ((select public.is_admin()));

-- Users can update their own profile (but not role — enforced by app logic)
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Admins can manage all profiles
CREATE POLICY "Admins can manage all profiles"
  ON public.user_profiles FOR ALL
  USING ((select public.is_admin()));

-- ==========================================
-- 5. Trigger: auto-create profile on signup
-- Every new auth.users row gets a profile
-- with role = 'negocio' by default
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
