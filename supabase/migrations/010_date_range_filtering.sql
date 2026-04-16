-- Migration 010: Date range filtering for execution trend and workflow metrics
-- Adds p_from/p_to params to get_execution_trend, plus new get_workflow_metrics_by_range RPC

-- ============================================================
-- Update get_execution_trend: add optional p_from / p_to
-- When provided, generates the series between those dates.
-- Falls back to p_days behaviour when both are NULL.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_execution_trend(
  p_instance_id UUID         DEFAULT NULL,
  p_workflow_id UUID         DEFAULT NULL,
  p_days        INTEGER      DEFAULT 30,
  p_from        TIMESTAMPTZ  DEFAULT NULL,
  p_to          TIMESTAMPTZ  DEFAULT NULL
)
RETURNS TABLE (
  day               DATE,
  total_executions  BIGINT,
  success_count     BIGINT,
  error_count       BIGINT,
  total_tokens      BIGINT,
  total_cost        NUMERIC
) AS $$
  SELECT
    d.day::DATE,
    COUNT(e.id)                                              AS total_executions,
    COUNT(e.id) FILTER (WHERE e.status = 'success')          AS success_count,
    COUNT(e.id) FILTER (WHERE e.status = 'error')            AS error_count,
    COALESCE(SUM(e.tokens_prompt + e.tokens_completion), 0)  AS total_tokens,
    COALESCE(SUM(e.cost_usd), 0)                             AS total_cost
  FROM generate_series(
    CASE WHEN p_from IS NOT NULL THEN p_from::DATE
         ELSE CURRENT_DATE - (p_days - 1)
    END,
    CASE WHEN p_to IS NOT NULL THEN p_to::DATE
         ELSE CURRENT_DATE
    END,
    '1 day'::INTERVAL
  ) AS d(day)
  LEFT JOIN public.n8n_executions e
    ON  DATE(e.created_at AT TIME ZONE 'UTC') = d.day::DATE
    AND (p_instance_id IS NULL OR e.instance_id = p_instance_id)
    AND (p_workflow_id IS NULL OR e.workflow_id  = p_workflow_id)
    AND (p_from IS NULL OR e.created_at >= p_from)
    AND (p_to   IS NULL OR e.created_at <= p_to)
  GROUP BY d.day
  ORDER BY d.day;
$$ LANGUAGE sql STABLE SECURITY INVOKER;

-- ============================================================
-- New RPC: get_workflow_metrics_by_range
-- Returns aggregated KPIs for a workflow within an optional
-- date range.  When p_from / p_to are NULL the function
-- aggregates all-time data (same window as the view).
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_workflow_metrics_by_range(
  p_workflow_id UUID,
  p_from        TIMESTAMPTZ DEFAULT NULL,
  p_to          TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_executions  BIGINT,
  success_count     BIGINT,
  error_count       BIGINT,
  error_rate        NUMERIC,
  total_tokens      BIGINT,
  total_cost        NUMERIC,
  avg_duration_ms   NUMERIC
) AS $$
  SELECT
    COUNT(*)                                                           AS total_executions,
    COUNT(*) FILTER (WHERE status = 'success')                         AS success_count,
    COUNT(*) FILTER (WHERE status = 'error')                           AS error_count,
    CASE WHEN COUNT(*) = 0 THEN 0
         ELSE ROUND(
           COUNT(*) FILTER (WHERE status = 'error')::NUMERIC
           / COUNT(*) * 100, 2)
    END                                                                AS error_rate,
    COALESCE(SUM(tokens_prompt + tokens_completion), 0)                AS total_tokens,
    COALESCE(SUM(cost_usd), 0)                                         AS total_cost,
    AVG(duration_ms)                                                   AS avg_duration_ms
  FROM public.n8n_executions
  WHERE workflow_id = p_workflow_id
    AND (p_from IS NULL OR created_at >= p_from)
    AND (p_to   IS NULL OR created_at <= p_to);
$$ LANGUAGE sql STABLE SECURITY INVOKER;
