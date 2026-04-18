-- Migration 016: case-insensitive event_type matching en get_workflow_event_count
-- N8N puede enviar el mismo event_type con distinta capitalización
-- (ej. Mensaje_Respondido vs mensaje_respondido) — LOWER() normaliza la comparación.

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
    AND LOWER(e.event_type) = LOWER(p_event_type)
    AND (p_from IS NULL OR e.started_at >= p_from)
    AND (p_to   IS NULL OR e.started_at <= p_to);
$$;
