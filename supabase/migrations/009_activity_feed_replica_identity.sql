-- ============================================================
-- Migration 9: activity_feed — REPLICA IDENTITY FULL
-- Sprint 3 (v0.8.x) — Realtime UPDATE fix
--
-- Supabase Realtime requires REPLICA IDENTITY FULL on tables
-- with RLS enabled in order to broadcast UPDATE events. Without
-- it, Postgres only writes the primary key of the old row to the
-- WAL, so Realtime cannot evaluate RLS against the old row state
-- and silently drops UPDATE broadcasts.
--
-- This fixes the dashboard not reflecting enrichment updates
-- (tokens/cost suffix appearing in activity feed descriptions
-- only after a full page reload).
-- ============================================================

ALTER TABLE public.activity_feed REPLICA IDENTITY FULL;

-- Optional: also apply to notifications (same reasoning, in case
-- we ever do mark-as-read from server side and want subscribers
-- to see the update live).
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
