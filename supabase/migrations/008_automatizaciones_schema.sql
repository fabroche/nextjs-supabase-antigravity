-- ============================================================
-- Migration 8: Automatizaciones — N8N Analytics Schema
-- Sprint 3 (v0.8.0) — Fase 1
--
-- Creates: n8n_instances, n8n_workflows, n8n_executions,
--          model_pricing, custom_metrics
-- Alters:  activity_feed (+ business_id)
-- Views:   n8n_instance_stats, n8n_workflow_stats
-- RPC:     get_execution_trend()
-- ============================================================

-- ==========================================
-- 1. Table: n8n_instances
-- One row per N8N instance, linked to a business
-- ==========================================
CREATE TABLE public.n8n_instances (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id   UUID        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  instance_id   TEXT        NOT NULL UNIQUE,   -- external identifier sent by N8N (e.g. "salon-prod")
  name          TEXT        NOT NULL,
  environment   TEXT        NOT NULL DEFAULT 'production'
                            CHECK (environment IN ('production', 'staging', 'development')),
  api_base_url  TEXT,                          -- for enrichment API calls (e.g. "https://n8n.example.com")
  api_key       TEXT,                          -- N8N API key for enrichment
  is_active     BOOLEAN     DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_n8n_instances_business ON public.n8n_instances(business_id);
CREATE INDEX idx_n8n_instances_instance_id ON public.n8n_instances(instance_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.n8n_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.n8n_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all instances"
  ON public.n8n_instances FOR ALL
  USING ((SELECT public.is_admin()));

CREATE POLICY "Owners can view own instances"
  ON public.n8n_instances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = n8n_instances.business_id
        AND businesses.owner_id = (SELECT auth.uid())
    )
  );

-- ==========================================
-- 2. Table: n8n_workflows
-- Auto-created on first webhook from a workflow
-- ==========================================
CREATE TABLE public.n8n_workflows (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id   UUID        NOT NULL REFERENCES public.n8n_instances(id) ON DELETE CASCADE,
  workflow_id   TEXT        NOT NULL,           -- N8N's workflow ID
  name          TEXT        NOT NULL,
  is_active     BOOLEAN     DEFAULT true,
  tags          TEXT[]      DEFAULT '{}',
  last_seen_at  TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instance_id, workflow_id)
);

CREATE INDEX idx_n8n_workflows_instance ON public.n8n_workflows(instance_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.n8n_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.n8n_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all workflows"
  ON public.n8n_workflows FOR ALL
  USING ((SELECT public.is_admin()));

CREATE POLICY "Owners can view own workflows"
  ON public.n8n_workflows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.n8n_instances
      JOIN public.businesses ON businesses.id = n8n_instances.business_id
      WHERE n8n_instances.id = n8n_workflows.instance_id
        AND businesses.owner_id = (SELECT auth.uid())
    )
  );

-- ==========================================
-- 3. Table: n8n_executions
-- Core analytics table — one row per execution
-- ==========================================
CREATE TABLE public.n8n_executions (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id       UUID        NOT NULL REFERENCES public.n8n_instances(id) ON DELETE CASCADE,
  workflow_id       UUID        NOT NULL REFERENCES public.n8n_workflows(id) ON DELETE CASCADE,
  execution_id      TEXT        NOT NULL,       -- N8N's execution ID
  status            TEXT        NOT NULL CHECK (status IN ('success', 'error', 'warning', 'running')),
  event_type        TEXT,                       -- business-level event (e.g. "cita_confirmada")
  tokens_prompt     INTEGER     DEFAULT 0,
  tokens_completion INTEGER     DEFAULT 0,
  model_name        TEXT,
  cost_usd          NUMERIC(10, 6) DEFAULT 0,
  duration_ms       INTEGER,
  error_message     TEXT,
  error_node        TEXT,
  is_enriched       BOOLEAN     DEFAULT false,
  metadata          JSONB       DEFAULT '{}',
  started_at        TIMESTAMPTZ DEFAULT now(),
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instance_id, execution_id)
);

CREATE INDEX idx_n8n_executions_workflow ON public.n8n_executions(workflow_id);
CREATE INDEX idx_n8n_executions_instance ON public.n8n_executions(instance_id);
CREATE INDEX idx_n8n_executions_created ON public.n8n_executions(created_at DESC);
CREATE INDEX idx_n8n_executions_status ON public.n8n_executions(status);
-- Composite for analytics queries (instance + date range + status)
CREATE INDEX idx_n8n_executions_instance_date
  ON public.n8n_executions(instance_id, created_at DESC, status);

-- RLS
ALTER TABLE public.n8n_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all executions"
  ON public.n8n_executions FOR ALL
  USING ((SELECT public.is_admin()));

CREATE POLICY "Owners can view own executions"
  ON public.n8n_executions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.n8n_instances
      JOIN public.businesses ON businesses.id = n8n_instances.business_id
      WHERE n8n_instances.id = n8n_executions.instance_id
        AND businesses.owner_id = (SELECT auth.uid())
    )
  );

-- ==========================================
-- 4. Table: model_pricing
-- LLM model pricing for cost calculation
-- ==========================================
CREATE TABLE public.model_pricing (
  id                      UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  model_name              TEXT        NOT NULL UNIQUE,
  provider                TEXT        NOT NULL,
  cost_per_1k_prompt      NUMERIC(10, 6) NOT NULL,
  cost_per_1k_completion  NUMERIC(10, 6) NOT NULL,
  is_active               BOOLEAN     DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.model_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: readable by all authenticated users (reference data)
ALTER TABLE public.model_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage model pricing"
  ON public.model_pricing FOR ALL
  USING ((SELECT public.is_admin()));

CREATE POLICY "Authenticated users can view pricing"
  ON public.model_pricing FOR SELECT
  USING (auth.role() = 'authenticated');

-- ==========================================
-- 5. Table: custom_metrics
-- Data-driven business metrics per workflow/instance
-- ==========================================
CREATE TABLE public.custom_metrics (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id       UUID        REFERENCES public.n8n_workflows(id) ON DELETE CASCADE,
  instance_id       UUID        REFERENCES public.n8n_instances(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  slug              TEXT        NOT NULL UNIQUE,
  metric_type       TEXT        NOT NULL CHECK (metric_type IN ('count', 'sum', 'avg', 'ratio')),
  filter_event_type TEXT,                       -- filter executions by this event_type
  source_field      TEXT,                       -- JSONB path in metadata to aggregate
  display_format    TEXT        DEFAULT 'number', -- number, currency, percentage, duration
  icon              TEXT,                       -- lucide icon name
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.custom_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.custom_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage custom metrics"
  ON public.custom_metrics FOR ALL
  USING ((SELECT public.is_admin()));

CREATE POLICY "Owners can view own custom metrics"
  ON public.custom_metrics FOR SELECT
  USING (
    -- Instance-scoped metrics
    (instance_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.n8n_instances
      JOIN public.businesses ON businesses.id = n8n_instances.business_id
      WHERE n8n_instances.id = custom_metrics.instance_id
        AND businesses.owner_id = (SELECT auth.uid())
    ))
    OR
    -- Workflow-scoped metrics
    (workflow_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.n8n_workflows
      JOIN public.n8n_instances ON n8n_instances.id = n8n_workflows.instance_id
      JOIN public.businesses ON businesses.id = n8n_instances.business_id
      WHERE n8n_workflows.id = custom_metrics.workflow_id
        AND businesses.owner_id = (SELECT auth.uid())
    ))
    OR
    -- Global metrics (no instance or workflow)
    (instance_id IS NULL AND workflow_id IS NULL)
  );

-- ==========================================
-- 6. Alter: activity_feed += business_id
-- ==========================================
ALTER TABLE public.activity_feed
  ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL;

CREATE INDEX idx_activity_feed_business ON public.activity_feed(business_id);

-- Update RLS: replace "all authenticated" with business-scoped access
DROP POLICY IF EXISTS "Authenticated users see activity feed" ON public.activity_feed;

CREATE POLICY "Admins see all activity"
  ON public.activity_feed FOR SELECT
  USING ((SELECT public.is_admin()));

CREATE POLICY "Owners see own and global activity"
  ON public.activity_feed FOR SELECT
  USING (
    business_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = activity_feed.business_id
        AND businesses.owner_id = (SELECT auth.uid())
    )
  );

-- ==========================================
-- 7. View: n8n_instance_stats
-- Aggregated metrics per instance (last 30 days)
-- ==========================================
CREATE OR REPLACE VIEW public.n8n_instance_stats AS
SELECT
  i.id,
  i.instance_id,
  i.name,
  i.environment,
  i.business_id,
  i.is_active,
  COUNT(e.id)                                                   AS total_executions,
  COUNT(e.id) FILTER (WHERE e.status = 'success')               AS success_count,
  COUNT(e.id) FILTER (WHERE e.status = 'error')                 AS error_count,
  ROUND(
    CASE WHEN COUNT(e.id) > 0
      THEN COUNT(e.id) FILTER (WHERE e.status = 'error')::NUMERIC / COUNT(e.id) * 100
      ELSE 0
    END, 1
  )                                                             AS error_rate,
  COALESCE(SUM(e.tokens_prompt + e.tokens_completion), 0)       AS total_tokens,
  COALESCE(SUM(e.cost_usd), 0)                                  AS total_cost,
  COUNT(DISTINCT e.workflow_id)                                  AS workflow_count,
  MAX(e.created_at)                                              AS last_execution_at
FROM public.n8n_instances i
LEFT JOIN public.n8n_executions e
  ON e.instance_id = i.id
  AND e.created_at >= NOW() - INTERVAL '30 days'
GROUP BY i.id, i.instance_id, i.name, i.environment, i.business_id, i.is_active;

-- ==========================================
-- 8. View: n8n_workflow_stats
-- Aggregated metrics per workflow (last 30 days)
-- ==========================================
CREATE OR REPLACE VIEW public.n8n_workflow_stats AS
SELECT
  w.id,
  w.instance_id,
  w.workflow_id,
  w.name,
  w.is_active,
  w.tags,
  COUNT(e.id)                                                   AS total_executions,
  COUNT(e.id) FILTER (WHERE e.status = 'success')               AS success_count,
  COUNT(e.id) FILTER (WHERE e.status = 'error')                 AS error_count,
  ROUND(
    CASE WHEN COUNT(e.id) > 0
      THEN COUNT(e.id) FILTER (WHERE e.status = 'error')::NUMERIC / COUNT(e.id) * 100
      ELSE 0
    END, 1
  )                                                             AS error_rate,
  COALESCE(SUM(e.tokens_prompt + e.tokens_completion), 0)       AS total_tokens,
  COALESCE(SUM(e.cost_usd), 0)                                  AS total_cost,
  ROUND(AVG(e.duration_ms))                                     AS avg_duration_ms,
  MAX(e.created_at)                                              AS last_execution_at
FROM public.n8n_workflows w
LEFT JOIN public.n8n_executions e
  ON e.workflow_id = w.id
  AND e.created_at >= NOW() - INTERVAL '30 days'
GROUP BY w.id, w.instance_id, w.workflow_id, w.name, w.is_active, w.tags;

-- ==========================================
-- 9. RPC: get_execution_trend()
-- Daily execution/error/cost data for charts
-- Uses SECURITY INVOKER so RLS applies
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_execution_trend(
  p_instance_id UUID DEFAULT NULL,
  p_workflow_id UUID DEFAULT NULL,
  p_days        INTEGER DEFAULT 30
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
    CURRENT_DATE - (p_days - 1),
    CURRENT_DATE,
    '1 day'::INTERVAL
  ) AS d(day)
  LEFT JOIN public.n8n_executions e
    ON DATE(e.created_at) = d.day::DATE
    AND (p_instance_id IS NULL OR e.instance_id = p_instance_id)
    AND (p_workflow_id IS NULL OR e.workflow_id = p_workflow_id)
  GROUP BY d.day
  ORDER BY d.day;
$$ LANGUAGE sql STABLE SECURITY INVOKER;

-- ==========================================
-- 10. Realtime: add n8n_executions
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.n8n_executions;

-- ==========================================
-- 11. Seed: model_pricing
-- Prices as of April 2025 (per 1K tokens)
-- ==========================================
INSERT INTO public.model_pricing (model_name, provider, cost_per_1k_prompt, cost_per_1k_completion) VALUES
  ('gpt-4o',            'openai',    0.002500, 0.010000),
  ('gpt-4o-mini',       'openai',    0.000150, 0.000600),
  ('gpt-4.1',           'openai',    0.002000, 0.008000),
  ('gpt-4.1-mini',      'openai',    0.000400, 0.001600),
  ('gpt-4.1-nano',      'openai',    0.000100, 0.000400),
  ('claude-sonnet-4',   'anthropic', 0.003000, 0.015000),
  ('claude-haiku-3.5',  'anthropic', 0.001000, 0.005000);
