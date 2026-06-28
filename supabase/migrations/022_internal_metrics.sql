-- Migration 022: Métricas internas Genzai (Sprint 5 — PR5)
-- Generaliza el motor (ratio sum/count + as_percent, sum multi-campo, filtro por status) y
-- añade la columna `audience` para separar métricas del cliente de las internas de Genzai.
-- Rollback: rollback_022_internal_metrics.sql

-- ============================================================
-- 1. Columna audience (client | internal)
-- ============================================================
ALTER TABLE public.custom_metrics
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'client'
  CHECK (audience IN ('client', 'internal'));

-- ============================================================
-- 2. metric_build_where: + filtro por status
-- ============================================================
CREATE OR REPLACE FUNCTION public.metric_build_where(
  p_workflow UUID,
  p_cfg JSONB,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_include_system BOOLEAN
) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE w TEXT;
BEGIN
  w := format('e.workflow_id = %L', p_workflow);
  IF p_from IS NOT NULL THEN w := w || format(' AND e.started_at >= %L', p_from); END IF;
  IF p_to   IS NOT NULL THEN w := w || format(' AND e.started_at <= %L', p_to);   END IF;
  IF p_cfg ? 'event_types' THEN
    w := w || format(
      ' AND lower(e.event_type) IN (SELECT lower(x) FROM jsonb_array_elements_text(%L::jsonb) x)',
      p_cfg->'event_types');
  END IF;
  IF (p_cfg #> '{filters,is_out_of_hours}') IS NOT NULL THEN
    w := w || format(' AND e.is_out_of_hours = %L', (p_cfg #>> '{filters,is_out_of_hours}')::boolean);
  END IF;
  IF (p_cfg #> '{filters,status}') IS NOT NULL THEN
    w := w || format(' AND e.status = %L', p_cfg #>> '{filters,status}');
  END IF;
  IF NOT p_include_system THEN
    w := w || ' AND e.status <> ''error'' AND lower(coalesce(e.event_type, '''')) <> ''workflow_error''';
  END IF;
  RETURN w;
END $$;

-- ============================================================
-- 3. metric_agg: agregado (count | sum field) según sub-config
-- ============================================================
CREATE OR REPLACE FUNCTION public.metric_agg(
  p_workflow UUID, p_cfg JSONB, p_from TIMESTAMPTZ, p_to TIMESTAMPTZ
) RETURNS NUMERIC
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE agg TEXT; fld TEXT; w TEXT; r NUMERIC;
BEGIN
  agg := coalesce(p_cfg->>'agg', 'count');
  w := public.metric_build_where(
    p_workflow, p_cfg, p_from, p_to,
    coalesce((p_cfg->>'include_system')::boolean, false));
  IF agg = 'sum' THEN
    fld := coalesce(p_cfg->>'field', 'cost_usd');
    EXECUTE format('SELECT coalesce(sum(e.%I),0) FROM public.n8n_executions e WHERE %s', fld, w) INTO r;
  ELSE
    EXECUTE format('SELECT count(*) FROM public.n8n_executions e WHERE %s', w) INTO r;
  END IF;
  RETURN coalesce(r, 0);
END $$;

-- ============================================================
-- 4. compute_metric: ratio generalizado + sum multi-campo
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_metric(
  p_metric_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to   TIMESTAMPTZ DEFAULT NULL
) RETURNS NUMERIC
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  m        public.custom_metrics%ROWTYPE;
  cfg      JSONB;
  t        TEXT;
  fld      TEXT;
  fld_expr TEXT;
  w        TEXT;
  num      NUMERIC;
  den      NUMERIC;
  incl     BOOLEAN;
  res      NUMERIC := 0;
BEGIN
  SELECT * INTO m FROM public.custom_metrics WHERE id = p_metric_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  cfg  := coalesce(m.config, '{}'::jsonb);
  t    := coalesce(m.metric_type, 'count');
  incl := coalesce((cfg->>'include_system')::boolean, false);

  IF t = 'count' THEN
    w := public.metric_build_where(m.workflow_id, cfg, p_from, p_to, incl);
    EXECUTE format('SELECT count(*) FROM public.n8n_executions e WHERE %s', w) INTO res;

  ELSIF t = 'count_distinct' THEN
    fld := coalesce(cfg->>'field', 'chat_id');
    w := public.metric_build_where(m.workflow_id, cfg, p_from, p_to, incl);
    EXECUTE format(
      'SELECT count(DISTINCT e.%I) FROM public.n8n_executions e WHERE %s AND e.%I IS NOT NULL AND e.%I <> ''''',
      fld, w, fld, fld) INTO res;

  ELSIF t IN ('sum_field', 'sum') THEN
    w := public.metric_build_where(m.workflow_id, cfg, p_from, p_to, incl);
    IF cfg ? 'fields' THEN
      SELECT string_agg(format('coalesce(e.%I,0)', f), ' + ')
        INTO fld_expr
        FROM jsonb_array_elements_text(cfg->'fields') AS f;
      EXECUTE format('SELECT coalesce(sum(%s),0) FROM public.n8n_executions e WHERE %s', fld_expr, w) INTO res;
    ELSE
      fld := coalesce(cfg->>'field', 'cost_usd');
      EXECUTE format('SELECT coalesce(sum(e.%I),0) FROM public.n8n_executions e WHERE %s', fld, w) INTO res;
    END IF;

  ELSIF t = 'weighted_sum' THEN
    w := public.metric_build_where(m.workflow_id, cfg, p_from, p_to, incl);
    EXECUTE format(
      'SELECT coalesce(sum((wt.value)::numeric),0)
       FROM public.n8n_executions e
       JOIN jsonb_each_text(%L::jsonb) wt ON lower(wt.key) = lower(e.event_type)
       WHERE %s',
      coalesce(cfg->'weights', '{}'::jsonb), w) INTO res;

  ELSIF t = 'ratio' THEN
    num := public.metric_agg(m.workflow_id, coalesce(cfg->'num', '{}'::jsonb), p_from, p_to);
    IF (cfg->>'den') = 'total' THEN
      den := public.metric_agg(m.workflow_id, '{"include_system":true}'::jsonb, p_from, p_to);
    ELSE
      den := public.metric_agg(m.workflow_id, coalesce(cfg->'den', '{}'::jsonb), p_from, p_to);
    END IF;
    IF den = 0 THEN
      res := 0;
    ELSIF coalesce((cfg->>'as_percent')::boolean, true) THEN
      res := round(num / den * 100, 1);
    ELSE
      res := round(num / den, 4);
    END IF;
  END IF;

  RETURN coalesce(res, 0);
END $$;

-- ============================================================
-- 5. Seed: métricas internas Genzai del Agente Agendador Gipsy
-- ============================================================
WITH ctx AS (
  SELECT w.id AS workflow_id, i.id AS instance_id
  FROM public.n8n_workflows w
  JOIN public.n8n_instances i ON i.id = w.instance_id
  WHERE i.instance_id = 'n8n-gipsy'
    AND w.workflow_id = 'cZw0Wjno07VgtmmJ'
  LIMIT 1
)
INSERT INTO public.custom_metrics
  (workflow_id, instance_id, name, slug, metric_type, config, display_format, icon, is_active, audience)
SELECT ctx.workflow_id, ctx.instance_id, v.name, v.slug, v.metric_type, v.config::jsonb, v.fmt, v.icon, true, 'internal'
FROM ctx, (VALUES
  ('Total Ejecuciones',     'agendador-int-total-ejecuciones', 'count',
     '{"include_system":true}', 'number', 'BarChart2'),
  ('Inversión API Total',   'agendador-int-inversion-api',     'sum_field',
     '{"field":"cost_usd","include_system":true}', 'currency', 'DollarSign'),
  ('Tokens Totales',        'agendador-int-tokens-totales',    'sum_field',
     '{"fields":["tokens_prompt","tokens_completion"],"include_system":true}', 'tokens', 'Cpu'),
  ('Tasa de Fallo',         'agendador-int-tasa-fallo',        'ratio',
     '{"num":{"filters":{"status":"error"},"include_system":true},"den":"total","as_percent":true}', 'percent', 'BarChart2'),
  ('Tasa de Finalización',  'agendador-int-tasa-finalizacion', 'ratio',
     '{"num":{"event_types":["Cita_Confirmada"]},"den":"total","as_percent":true}', 'percent', 'CalendarCheck'),
  ('Costo Adquisición Cita','agendador-int-costo-adq-cita',    'ratio',
     '{"num":{"agg":"sum","field":"cost_usd","include_system":true},"den":{"event_types":["Cita_Confirmada"]},"as_percent":false}', 'currency', 'DollarSign')
) AS v(name, slug, metric_type, config, fmt, icon)
ON CONFLICT (slug) DO NOTHING;
