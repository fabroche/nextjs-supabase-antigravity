-- ============================================================
-- Migration 2: Business Data Tables
-- Creates businesses, transactions, and business_metrics_snapshot
-- with RLS policies and indexes
-- ============================================================

-- ==========================================
-- 1. Table: businesses
-- ==========================================
CREATE TABLE public.businesses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  currency   TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Index: lookup by owner
CREATE INDEX idx_businesses_owner_id ON public.businesses(owner_id);

-- Enable RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Owners can view their own businesses
CREATE POLICY "Owners can view own businesses"
  ON public.businesses FOR SELECT
  USING (owner_id = (select auth.uid()));

-- Owners can create businesses for themselves
CREATE POLICY "Owners can create businesses"
  ON public.businesses FOR INSERT
  WITH CHECK (owner_id = (select auth.uid()));

-- Owners can update their own businesses
CREATE POLICY "Owners can update own businesses"
  ON public.businesses FOR UPDATE
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

-- Admins can do everything
CREATE POLICY "Admins can manage all businesses"
  ON public.businesses FOR ALL
  USING ((select public.is_admin()));

-- ==========================================
-- 2. Table: transactions
-- Core table — metrics and chart data are
-- derived from this via queries/views
-- ==========================================
CREATE TABLE public.transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_name  TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  amount         NUMERIC(12, 2) NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('success', 'pending', 'failed')),
  concept        TEXT,       -- Sprint 2: transaction description
  category       TEXT,       -- Sprint 2: transaction category
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_transactions_business_id ON public.transactions(business_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_transactions_category ON public.transactions(category);

-- Composite index for metrics queries (business + status + date)
CREATE INDEX idx_transactions_biz_status_date
  ON public.transactions(business_id, status, created_at DESC);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Owners can view transactions for their businesses
CREATE POLICY "Owners can view own transactions"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = transactions.business_id
        AND businesses.owner_id = (select auth.uid())
    )
  );

-- Owners can create transactions for their businesses
CREATE POLICY "Owners can create transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = transactions.business_id
        AND businesses.owner_id = (select auth.uid())
    )
  );

-- Owners can update transactions for their businesses
CREATE POLICY "Owners can update own transactions"
  ON public.transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = transactions.business_id
        AND businesses.owner_id = (select auth.uid())
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all transactions"
  ON public.transactions FOR ALL
  USING ((select public.is_admin()));

-- ==========================================
-- 3. Table: business_metrics_snapshot
-- Daily snapshots for non-transaction metrics
-- (active_users, active_now)
-- ==========================================
CREATE TABLE public.business_metrics_snapshot (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  active_users  INTEGER NOT NULL DEFAULT 0,
  active_now    INTEGER NOT NULL DEFAULT 0,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, snapshot_date)
);

-- Index: lookup by business + date
CREATE INDEX idx_snapshots_biz_date
  ON public.business_metrics_snapshot(business_id, snapshot_date DESC);

-- Enable RLS
ALTER TABLE public.business_metrics_snapshot ENABLE ROW LEVEL SECURITY;

-- Owners can view snapshots for their businesses
CREATE POLICY "Owners can view own snapshots"
  ON public.business_metrics_snapshot FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = business_metrics_snapshot.business_id
        AND businesses.owner_id = (select auth.uid())
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all snapshots"
  ON public.business_metrics_snapshot FOR ALL
  USING ((select public.is_admin()));
