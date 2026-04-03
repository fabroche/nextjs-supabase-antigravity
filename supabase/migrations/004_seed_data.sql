-- ============================================================
-- Migration 4: Seed Data
-- Populates the database with initial data matching the
-- current mock-businesses.ts structure.
--
-- IMPORTANT: This migration assumes the following users have
-- already signed up via Supabase Auth (the handle_new_user
-- trigger creates their profiles automatically):
--   - brochegomezf@gmail.com (will be promoted to admin)
--   - kraxusmmo@gmail.com (owner of Tech Solutions Inc.)
--   - user2@example.com (owner of E-Commerce Pro)
--   - user3@example.com (owner of Marketing Agency)
--
-- If the users don't exist yet, run this AFTER they sign up.
-- ============================================================

-- ==========================================
-- 1. Promote admin user
-- ==========================================
UPDATE public.user_profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'brochegomezf@gmail.com');

-- ==========================================
-- 2. Insert businesses
-- Using fixed UUIDs for seed data so we can
-- reference them in transaction inserts
-- ==========================================
INSERT INTO public.businesses (id, owner_id, name, currency) VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    (SELECT id FROM auth.users WHERE email = 'kraxusmmo@gmail.com'),
    'Tech Solutions Inc.',
    'USD'
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    (SELECT id FROM auth.users WHERE email = 'user2@example.com'),
    'E-Commerce Pro',
    'USD'
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    (SELECT id FROM auth.users WHERE email = 'user3@example.com'),
    'Marketing Agency',
    'USD'
  );

-- ==========================================
-- 3. Insert recent activity transactions
-- These match the recentActivity arrays from
-- mock-businesses.ts
-- ==========================================

-- Business 1: Tech Solutions Inc.
INSERT INTO public.transactions (business_id, customer_name, customer_email, amount, status, concept, category, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Olivia Martin',    'olivia.martin@email.com',    1999.00, 'success', 'Software License',  'software',     now() - INTERVAL '1 day'),
  ('a0000000-0000-0000-0000-000000000001', 'Jackson Lee',      'jackson.lee@email.com',        39.00, 'success', 'Monthly Plan',      'subscription', now() - INTERVAL '2 days'),
  ('a0000000-0000-0000-0000-000000000001', 'Isabella Nguyen',  'isabella.nguyen@email.com',   299.00, 'pending', 'Consulting',        'services',     now() - INTERVAL '3 days'),
  ('a0000000-0000-0000-0000-000000000001', 'William Kim',      'will@email.com',               99.00, 'success', 'Add-on Module',     'software',     now() - INTERVAL '4 days'),
  ('a0000000-0000-0000-0000-000000000001', 'Sofia Davis',      'sofia.davis@email.com',        39.00, 'failed',  'Monthly Plan',      'subscription', now() - INTERVAL '5 days');

-- Business 2: E-Commerce Pro
INSERT INTO public.transactions (business_id, customer_name, customer_email, amount, status, concept, category, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'Emma Wilson',      'emma.w@shop.com',            2499.00, 'success', 'Premium Package',   'product',      now() - INTERVAL '1 day'),
  ('a0000000-0000-0000-0000-000000000002', 'Liam Brown',       'liam.b@shop.com',             899.00, 'success', 'Bulk Order',        'product',      now() - INTERVAL '2 days'),
  ('a0000000-0000-0000-0000-000000000002', 'Ava Johnson',      'ava.j@shop.com',             1299.00, 'success', 'Annual Subscription','subscription', now() - INTERVAL '3 days'),
  ('a0000000-0000-0000-0000-000000000002', 'Noah Davis',       'noah.d@shop.com',             599.00, 'pending', 'Electronics Bundle','product',      now() - INTERVAL '4 days'),
  ('a0000000-0000-0000-0000-000000000002', 'Mia Garcia',       'mia.g@shop.com',              199.00, 'success', 'Accessories Pack',  'product',      now() - INTERVAL '5 days');

-- Business 3: Marketing Agency
INSERT INTO public.transactions (business_id, customer_name, customer_email, amount, status, concept, category, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000003', 'James Miller',     'james@agency.com',           3500.00, 'success', 'Campaign Setup',    'services',     now() - INTERVAL '1 day'),
  ('a0000000-0000-0000-0000-000000000003', 'Charlotte Taylor', 'charlotte@agency.com',       1200.00, 'success', 'Social Media Mgmt', 'services',     now() - INTERVAL '2 days'),
  ('a0000000-0000-0000-0000-000000000003', 'Benjamin Moore',   'ben@agency.com',             2800.00, 'pending', 'SEO Package',       'services',     now() - INTERVAL '3 days'),
  ('a0000000-0000-0000-0000-000000000003', 'Amelia Anderson',  'amelia@agency.com',           950.00, 'success', 'Content Creation',  'services',     now() - INTERVAL '4 days'),
  ('a0000000-0000-0000-0000-000000000003', 'Lucas Thomas',     'lucas@agency.com',           1500.00, 'success', 'Email Campaign',    'services',     now() - INTERVAL '5 days');

-- ==========================================
-- 4. Insert historical transactions
-- These produce the chart data when aggregated
-- by month (matching mock chartData values)
-- ==========================================

-- Business 1: Tech Solutions Inc.
-- Chart: Ene=8500, Feb=22000, Mar=12300, Abr=28500, May=15800, Jun=32100
INSERT INTO public.transactions (business_id, customer_name, customer_email, amount, status, concept, category, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Monthly Revenue', 'system@internal', 8500.00,  'success', 'Monthly aggregate', 'revenue', '2026-01-15T12:00:00Z'),
  ('a0000000-0000-0000-0000-000000000001', 'Monthly Revenue', 'system@internal', 22000.00, 'success', 'Monthly aggregate', 'revenue', '2026-02-15T12:00:00Z'),
  ('a0000000-0000-0000-0000-000000000001', 'Monthly Revenue', 'system@internal', 12300.00, 'success', 'Monthly aggregate', 'revenue', '2026-03-15T12:00:00Z'),
  ('a0000000-0000-0000-0000-000000000001', 'Monthly Revenue', 'system@internal', 28500.00, 'success', 'Monthly aggregate', 'revenue', '2026-04-15T12:00:00Z'),
  ('a0000000-0000-0000-0000-000000000001', 'Monthly Revenue', 'system@internal', 15800.00, 'success', 'Monthly aggregate', 'revenue', '2026-05-15T12:00:00Z'),
  ('a0000000-0000-0000-0000-000000000001', 'Monthly Revenue', 'system@internal', 32100.00, 'success', 'Monthly aggregate', 'revenue', '2026-06-15T12:00:00Z');

-- Business 2: E-Commerce Pro
-- Chart: Ene=35000, Feb=28500, Mar=42000, Abr=31200, May=48500, Jun=39800
INSERT INTO public.transactions (business_id, customer_name, customer_email, amount, status, concept, category, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'Monthly Revenue', 'system@internal', 35000.00, 'success', 'Monthly aggregate', 'revenue', '2026-01-15T12:00:00Z'),
  ('a0000000-0000-0000-0000-000000000002', 'Monthly Revenue', 'system@internal', 28500.00, 'success', 'Monthly aggregate', 'revenue', '2026-02-15T12:00:00Z'),
  ('a0000000-0000-0000-0000-000000000002', 'Monthly Revenue', 'system@internal', 42000.00, 'success', 'Monthly aggregate', 'revenue', '2026-03-15T12:00:00Z'),
  ('a0000000-0000-0000-0000-000000000002', 'Monthly Revenue', 'system@internal', 31200.00, 'success', 'Monthly aggregate', 'revenue', '2026-04-15T12:00:00Z'),
  ('a0000000-0000-0000-0000-000000000002', 'Monthly Revenue', 'system@internal', 48500.00, 'success', 'Monthly aggregate', 'revenue', '2026-05-15T12:00:00Z'),
  ('a0000000-0000-0000-0000-000000000002', 'Monthly Revenue', 'system@internal', 39800.00, 'success', 'Monthly aggregate', 'revenue', '2026-06-15T12:00:00Z');

-- Business 3: Marketing Agency
-- Chart: Ene=5200, Feb=14800, Mar=7500, Abr=18200, May=9800, Jun=21500
INSERT INTO public.transactions (business_id, customer_name, customer_email, amount, status, concept, category, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000003', 'Monthly Revenue', 'system@internal', 5200.00,  'success', 'Monthly aggregate', 'revenue', '2026-01-15T12:00:00Z'),
  ('a0000000-0000-0000-0000-000000000003', 'Monthly Revenue', 'system@internal', 14800.00, 'success', 'Monthly aggregate', 'revenue', '2026-02-15T12:00:00Z'),
  ('a0000000-0000-0000-0000-000000000003', 'Monthly Revenue', 'system@internal', 7500.00,  'success', 'Monthly aggregate', 'revenue', '2026-03-15T12:00:00Z'),
  ('a0000000-0000-0000-0000-000000000003', 'Monthly Revenue', 'system@internal', 18200.00, 'success', 'Monthly aggregate', 'revenue', '2026-04-15T12:00:00Z'),
  ('a0000000-0000-0000-0000-000000000003', 'Monthly Revenue', 'system@internal', 9800.00,  'success', 'Monthly aggregate', 'revenue', '2026-05-15T12:00:00Z'),
  ('a0000000-0000-0000-0000-000000000003', 'Monthly Revenue', 'system@internal', 21500.00, 'success', 'Monthly aggregate', 'revenue', '2026-06-15T12:00:00Z');

-- ==========================================
-- 5. Insert active user snapshots
-- Matches the mock activeUsers/activeNow values
-- ==========================================
INSERT INTO public.business_metrics_snapshot (business_id, active_users, active_now, snapshot_date) VALUES
  ('a0000000-0000-0000-0000-000000000001', 2350, 573, CURRENT_DATE),
  ('a0000000-0000-0000-0000-000000000002', 4820, 892, CURRENT_DATE),
  ('a0000000-0000-0000-0000-000000000003', 1250, 324, CURRENT_DATE);

-- Previous day snapshots (for calculating % change)
INSERT INTO public.business_metrics_snapshot (business_id, active_users, active_now, snapshot_date) VALUES
  ('a0000000-0000-0000-0000-000000000001', 2170, 372, CURRENT_DATE - 1),
  ('a0000000-0000-0000-0000-000000000002', 4575, 736, CURRENT_DATE - 1),
  ('a0000000-0000-0000-0000-000000000003', 1155, 246, CURRENT_DATE - 1);
