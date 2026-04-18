-- Migration 014: Custom metrics para workflow Agente Agendador
-- 4 funciones RPC por event_type + registros en custom_metrics

-- ─────────────────────────────────────────────────────────────
-- RPC functions
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_workflow_mensajes_respondidos(
  p_workflow_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to   TIMESTAMPTZ DEFAULT NULL
) RETURNS BIGINT LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT COUNT(*) FROM public.n8n_executions e
  WHERE e.workflow_id = p_workflow_id
    AND e.event_type = 'Mensaje_Respondido'
    AND (p_from IS NULL OR e.started_at >= p_from)
    AND (p_to   IS NULL OR e.started_at <= p_to);
$$;

CREATE OR REPLACE FUNCTION public.get_workflow_citas_confirmadas(
  p_workflow_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to   TIMESTAMPTZ DEFAULT NULL
) RETURNS BIGINT LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT COUNT(*) FROM public.n8n_executions e
  WHERE e.workflow_id = p_workflow_id
    AND e.event_type = 'Cita_Confirmada'
    AND (p_from IS NULL OR e.started_at >= p_from)
    AND (p_to   IS NULL OR e.started_at <= p_to);
$$;

CREATE OR REPLACE FUNCTION public.get_workflow_cancelaciones(
  p_workflow_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to   TIMESTAMPTZ DEFAULT NULL
) RETURNS BIGINT LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT COUNT(*) FROM public.n8n_executions e
  WHERE e.workflow_id = p_workflow_id
    AND e.event_type = 'Cancelacion'
    AND (p_from IS NULL OR e.started_at >= p_from)
    AND (p_to   IS NULL OR e.started_at <= p_to);
$$;

CREATE OR REPLACE FUNCTION public.get_workflow_consultas_disponibilidad(
  p_workflow_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to   TIMESTAMPTZ DEFAULT NULL
) RETURNS BIGINT LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT COUNT(*) FROM public.n8n_executions e
  WHERE e.workflow_id = p_workflow_id
    AND e.event_type = 'Consulta_Disponibilidad'
    AND (p_from IS NULL OR e.started_at >= p_from)
    AND (p_to   IS NULL OR e.started_at <= p_to);
$$;

-- ─────────────────────────────────────────────────────────────
-- Registros en custom_metrics
-- Ajusta los UUIDs si el workflow cambia de entorno
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.custom_metrics
  (workflow_id, instance_id, name, slug, metric_type, filter_event_type, source_field, display_format, icon)
VALUES
  ('9f362d0d-7d40-4df2-88b3-1c8d64aba169', '412e35f8-7ea2-4788-ac03-b41f11c642f6',
   'Mensajes respondidos',    'mensajes-respondidos',      'count', 'Mensaje_Respondido',    NULL, 'number', 'MessageCircle'),
  ('9f362d0d-7d40-4df2-88b3-1c8d64aba169', '412e35f8-7ea2-4788-ac03-b41f11c642f6',
   'Citas confirmadas',       'citas-confirmadas',         'count', 'Cita_Confirmada',       NULL, 'number', 'CalendarCheck'),
  ('9f362d0d-7d40-4df2-88b3-1c8d64aba169', '412e35f8-7ea2-4788-ac03-b41f11c642f6',
   'Cancelaciones',           'cancelaciones',             'count', 'Cancelacion',           NULL, 'number', 'CalendarX'),
  ('9f362d0d-7d40-4df2-88b3-1c8d64aba169', '412e35f8-7ea2-4788-ac03-b41f11c642f6',
   'Consultas disponibilidad','consultas-disponibilidad',  'count', 'Consulta_Disponibilidad',NULL, 'number', 'Search');

-- Rollback: see rollback_014_custom_metrics_agendador.sql
