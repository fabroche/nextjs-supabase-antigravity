-- ============================================================
-- Migration 3: Views and RPC Functions
-- Creates business_metrics view, get_monthly_chart_data,
-- and get_user_role functions
-- ============================================================

-- ==========================================
-- 1. View: business_metrics
-- Derives revenue, sales, and % changes
-- from the transactions table
-- ==========================================
CREATE OR REPLACE VIEW public.business_metrics AS
SELECT
  b.id AS business_id,
  b.name AS business_name,

  -- Current month revenue (successful transactions only)
  COALESCE(SUM(t.amount) FILTER (
    WHERE t.status = 'success'
      AND t.created_at >= date_trunc('month', now())
  ), 0) AS total_revenue,

  -- Previous month revenue
  COALESCE(SUM(t.amount) FILTER (
    WHERE t.status = 'success'
      AND t.created_at >= date_trunc('month', now() - INTERVAL '1 month')
      AND t.created_at < date_trunc('month', now())
  ), 0) AS prev_revenue,

  -- Revenue change % (current vs previous month)
  CASE
    WHEN COALESCE(SUM(t.amount) FILTER (
      WHERE t.status = 'success'
        AND t.created_at >= date_trunc('month', now() - INTERVAL '1 month')
        AND t.created_at < date_trunc('month', now())
    ), 0) = 0 THEN 0
    ELSE ROUND(
      (
        COALESCE(SUM(t.amount) FILTER (
          WHERE t.status = 'success'
            AND t.created_at >= date_trunc('month', now())
        ), 0)
        -
        COALESCE(SUM(t.amount) FILTER (
          WHERE t.status = 'success'
            AND t.created_at >= date_trunc('month', now() - INTERVAL '1 month')
            AND t.created_at < date_trunc('month', now())
        ), 0)
      ) * 100.0
      /
      NULLIF(SUM(t.amount) FILTER (
        WHERE t.status = 'success'
          AND t.created_at >= date_trunc('month', now() - INTERVAL '1 month')
          AND t.created_at < date_trunc('month', now())
      ), 0),
      1
    )
  END AS revenue_change,

  -- Current month sales count
  COUNT(*) FILTER (
    WHERE t.status = 'success'
      AND t.created_at >= date_trunc('month', now())
  ) AS sales,

  -- Previous month sales count
  COUNT(*) FILTER (
    WHERE t.status = 'success'
      AND t.created_at >= date_trunc('month', now() - INTERVAL '1 month')
      AND t.created_at < date_trunc('month', now())
  ) AS prev_sales,

  -- Sales change %
  CASE
    WHEN COUNT(*) FILTER (
      WHERE t.status = 'success'
        AND t.created_at >= date_trunc('month', now() - INTERVAL '1 month')
        AND t.created_at < date_trunc('month', now())
    ) = 0 THEN 0
    ELSE ROUND(
      (
        COUNT(*) FILTER (
          WHERE t.status = 'success'
            AND t.created_at >= date_trunc('month', now())
        )
        -
        COUNT(*) FILTER (
          WHERE t.status = 'success'
            AND t.created_at >= date_trunc('month', now() - INTERVAL '1 month')
            AND t.created_at < date_trunc('month', now())
        )
      ) * 100.0
      /
      NULLIF(COUNT(*) FILTER (
        WHERE t.status = 'success'
          AND t.created_at >= date_trunc('month', now() - INTERVAL '1 month')
          AND t.created_at < date_trunc('month', now())
      ), 0),
      1
    )
  END AS sales_change

FROM public.businesses b
LEFT JOIN public.transactions t ON t.business_id = b.id
GROUP BY b.id, b.name;

-- Note: This view inherits RLS from the underlying tables.
-- Admin sees all businesses, negocio sees only their own.

-- ==========================================
-- 2. Function: get_monthly_chart_data
-- Returns monthly revenue for the OverviewChart
-- component. Uses generate_series to include
-- months with zero transactions.
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_monthly_chart_data(
  p_business_id UUID,
  p_months INTEGER DEFAULT 6
)
RETURNS TABLE (month TEXT, value NUMERIC) AS $$
  SELECT
    to_char(series.month_start, 'Mon') AS month,
    COALESCE(SUM(t.amount) FILTER (WHERE t.status = 'success'), 0) AS value
  FROM generate_series(
    date_trunc('month', now()) - ((p_months - 1) || ' months')::INTERVAL,
    date_trunc('month', now()),
    '1 month'::INTERVAL
  ) AS series(month_start)
  LEFT JOIN public.transactions t
    ON t.business_id = p_business_id
    AND date_trunc('month', t.created_at) = series.month_start
  GROUP BY series.month_start
  ORDER BY series.month_start;
$$ LANGUAGE sql STABLE SECURITY INVOKER;

-- SECURITY INVOKER means RLS policies on transactions apply.
-- The caller must have access to the business's transactions.

-- ==========================================
-- 3. Function: get_user_role
-- Returns the role of the authenticated user.
-- Replaces the isAdminUser() mock function.
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;
