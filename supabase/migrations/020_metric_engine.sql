-- Migration 020: Motor de métricas configurable (Sprint 5 — PR3)
-- Reemplaza las funciones hardcodeadas de la 014 por un motor genérico data-driven.
-- Una métrica = una fila en custom_metrics con metric_type + config JSONB; un solo RPC
-- (compute_metric) las calcula todas. Escala a cualquier cliente sin código.
-- Rollback: rollback_020_metric_engine.sql

-- ============================================================
-- 1. Extender custom_metrics: ampliar metric_type + añadir config
-- ============================================================
ALTER TABLE public.custom_metrics
  DROP CONSTRAINT IF EXISTS custom_metrics_metric_type_check;

ALTER TABLE public.custom_metrics
  ADD CONSTRAINT custom_metrics_metric_type_check
  CHECK (metric_type IN ('count','count_distinct','weighted_sum','ratio','sum_field','sum','avg'));

ALTER TABLE public.custom_metrics
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ============================================================
-- 2. Helper: construye el WHERE de n8n_executions desde un config
--    Filtros soportados: event_types[] (case-insensitive), filters.is_out_of_hours.
--    Excluye errores/tipos system salvo include_system=true.
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
  IF NOT p_include_system THEN
    w := w || ' AND e.status <> ''error'' AND lower(coalesce(e.event_type, '''')) <> ''workflow_error''';
  END IF;
  RETURN w;
END $$;

-- ============================================================
-- 3. RPC genérico compute_metric
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_metric(
  p_metric_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to   TIMESTAMPTZ DEFAULT NULL
) RETURNS NUMERIC
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  m    public.custom_metrics%ROWTYPE;
  cfg  JSONB;
  t    TEXT;
  fld  TEXT;
  w    TEXT;
  wnum TEXT;
  wden TEXT;
  num  NUMERIC;
  den  NUMERIC;
  incl BOOLEAN;
  res  NUMERIC := 0;
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
    fld := coalesce(cfg->>'field', 'cost_usd');
    w := public.metric_build_where(m.workflow_id, cfg, p_from, p_to, incl);
    EXECUTE format('SELECT coalesce(sum(e.%I),0) FROM public.n8n_executions e WHERE %s', fld, w) INTO res;

  ELSIF t = 'weighted_sum' THEN
    w := public.metric_build_where(m.workflow_id, cfg, p_from, p_to, incl);
    EXECUTE format(
      'SELECT coalesce(sum((wt.value)::numeric),0)
       FROM public.n8n_executions e
       JOIN jsonb_each_text(%L::jsonb) wt ON lower(wt.key) = lower(e.event_type)
       WHERE %s',
      coalesce(cfg->'weights', '{}'::jsonb), w) INTO res;

  ELSIF t = 'ratio' THEN
    wnum := public.metric_build_where(
      m.workflow_id, coalesce(cfg->'num', '{}'::jsonb), p_from, p_to,
      coalesce((cfg #>> '{num,include_system}')::boolean, false));
    EXECUTE format('SELECT count(*) FROM public.n8n_executions e WHERE %s', wnum) INTO num;
    IF (cfg->>'den') = 'total' THEN
      wden := public.metric_build_where(m.workflow_id, '{}'::jsonb, p_from, p_to, true);
    ELSE
      wden := public.metric_build_where(m.workflow_id, coalesce(cfg->'den', '{}'::jsonb), p_from, p_to, true);
    END IF;
    EXECUTE format('SELECT count(*) FROM public.n8n_executions e WHERE %s', wden) INTO den;
    res := CASE WHEN den > 0 THEN round(num::numeric / den * 100, 1) ELSE 0 END;
  END IF;

  RETURN coalesce(res, 0);
END $$;

-- ============================================================
-- 4. Limpiar la 014: borrar funciones dedicadas + seeds mal apuntados
-- ============================================================
DROP FUNCTION IF EXISTS public.get_workflow_mensajes_respondidos(UUID, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.get_workflow_citas_confirmadas(UUID, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.get_workflow_cancelaciones(UUID, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.get_workflow_consultas_disponibilidad(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

DELETE FROM public.custom_metrics
WHERE slug IN ('mensajes-respondidos','citas-confirmadas','cancelaciones','consultas-disponibilidad');

-- ============================================================
-- 5. Reseed: 7 métricas del Agente Agendador Gipsy, apuntando al workflow CORRECTO
--    (n8n-gipsy / cZw0Wjno07VgtmmJ = UUID 5e5c8fec). Resuelto por sub-select.
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
  (workflow_id, instance_id, name, slug, metric_type, config, display_format, icon, is_active)
SELECT ctx.workflow_id, ctx.instance_id, v.name, v.slug, v.metric_type, v.config::jsonb, 'number', v.icon, v.is_active
FROM ctx, (VALUES
  ('Interacciones',                'agendador-interacciones',          'count',
     '{}', 'MessageCircle', true),
  ('Interacciones Fuera de Horario','agendador-interacciones-fh',      'count',
     '{"filters":{"is_out_of_hours":true}}', 'Clock', true),
  ('Citas Confirmadas FH',         'agendador-citas-confirmadas-fh',   'count',
     '{"event_types":["Cita_Confirmada"],"filters":{"is_out_of_hours":true}}', 'CalendarCheck', true),
  ('Clientes Atendidos',           'agendador-clientes-atendidos',     'count_distinct',
     '{"field":"chat_id"}', 'BarChart2', true),
  ('Cancelaciones',                'agendador-cancelaciones',          'count',
     '{"event_types":["Cancelacion"]}', 'CalendarX', true),
  ('Reasignaciones Auto',          'agendador-reasignaciones',         'count',
     '{"event_types":["Reprogramacion","Reagendada","Reasignacion"]}', 'BarChart2', false),
  ('Tiempo Ahorrado (min)',        'agendador-tiempo-ahorrado',        'weighted_sum',
     '{"weights":{"Cita_Confirmada":5,"Reprogramacion":4,"Reagendada":4,"Reasignacion":4,"Cancelacion":3,"Consulta_Disponibilidad":2,"Consulta_Servicios":2,"Consulta_Citas":2,"Mensaje_Respondido":1}}',
     'Hourglass', true)
) AS v(name, slug, metric_type, config, icon, is_active)
ON CONFLICT (slug) DO NOTHING;
