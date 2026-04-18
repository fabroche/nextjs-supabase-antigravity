-- Migration 015: is_active en custom_metrics + RPC genérica por event_type

ALTER TABLE public.custom_metrics
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- RPC genérica — reemplaza las 4 funciones individuales de la 014 para nuevas métricas
CREATE OR REPLACE FUNCTION public.get_workflow_event_count(
  p_workflow_id UUID,
  p_event_type  TEXT,
  p_from        TIMESTAMPTZ DEFAULT NULL,
  p_to          TIMESTAMPTZ DEFAULT NULL
) RETURNS BIGINT
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT COUNT(*)
  FROM public.n8n_executions e
  WHERE e.workflow_id = p_workflow_id
    AND e.event_type  = p_event_type
    AND (p_from IS NULL OR e.started_at >= p_from)
    AND (p_to   IS NULL OR e.started_at <= p_to);
$$;

-- Rollback: see rollback_015_custom_metrics_is_active.sql
