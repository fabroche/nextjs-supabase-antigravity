-- Migration 012: metric_definitions registry + user_profiles.ui_preferences

-- 1. metric_definitions table
CREATE TABLE public.metric_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key             TEXT NOT NULL,
  scope           TEXT NOT NULL CHECK (scope IN ('global', 'instance', 'workflow')),
  label           TEXT NOT NULL,
  description     TEXT,
  format          TEXT NOT NULL CHECK (format IN ('number', 'currency', 'percent', 'tokens')),
  icon            TEXT,
  display_order   INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  business_id     UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (key, scope, business_id)
);

CREATE INDEX idx_metric_defs_scope     ON public.metric_definitions(scope, is_active);
CREATE INDEX idx_metric_defs_business  ON public.metric_definitions(business_id);

CREATE TRIGGER set_updated_at_metric_defs
  BEFORE UPDATE ON public.metric_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.metric_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read metric definitions"
  ON public.metric_definitions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage metric definitions"
  ON public.metric_definitions FOR ALL
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- 2. Seeds — 12 rows (4 keys × 3 scopes, business_id = NULL = preset global)
INSERT INTO public.metric_definitions (key, scope, label, description, format, icon, display_order, business_id) VALUES
  -- global
  ('executions_total', 'global',   'Ejecuciones',   'Total de ejecuciones en el rango',   'number',   'Activity',    0, NULL),
  ('error_rate',       'global',   'Tasa de error', '% de ejecuciones fallidas',           'percent',  'AlertCircle', 1, NULL),
  ('total_cost_usd',   'global',   'Costo',         'Costo total en USD',                  'currency', 'DollarSign',  2, NULL),
  ('total_tokens',     'global',   'Tokens',         'Tokens totales consumidos',           'tokens',   'Zap',         3, NULL),
  -- instance
  ('executions_total', 'instance', 'Ejecuciones',   'Ejecuciones en esta instancia',       'number',   'Activity',    0, NULL),
  ('error_rate',       'instance', 'Tasa de error', '% de ejecuciones fallidas',           'percent',  'AlertCircle', 1, NULL),
  ('total_cost_usd',   'instance', 'Costo',         'Costo de esta instancia',             'currency', 'DollarSign',  2, NULL),
  ('total_tokens',     'instance', 'Tokens',         'Tokens consumidos',                  'tokens',   'Zap',         3, NULL),
  -- workflow
  ('executions_total', 'workflow', 'Ejecuciones',   'Ejecuciones de este workflow',        'number',   'Activity',    0, NULL),
  ('error_rate',       'workflow', 'Tasa de error', '% de ejecuciones fallidas',           'percent',  'AlertCircle', 1, NULL),
  ('total_cost_usd',   'workflow', 'Costo',         'Costo de este workflow',              'currency', 'DollarSign',  2, NULL),
  ('total_tokens',     'workflow', 'Tokens',         'Tokens consumidos',                  'tokens',   'Zap',         3, NULL);

-- 3. user_profiles.ui_preferences
ALTER TABLE public.user_profiles
  ADD COLUMN ui_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Rollback: see rollback_012_metric_registry_and_ui_prefs.sql
