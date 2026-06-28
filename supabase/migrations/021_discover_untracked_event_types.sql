-- Migration 021: RPC discover_untracked_event_types (Sprint 5 — PR4)
-- Auto-descubrimiento: devuelve los event_type presentes en n8n_executions que NO están
-- en el catálogo (event_types) de su workflow, para clasificarlos desde el panel de admin.
-- Match case-insensitive contra el catálogo. SECURITY INVOKER → respeta RLS del que llama.
-- Rollback: rollback_021_discover_untracked_event_types.sql

CREATE OR REPLACE FUNCTION public.discover_untracked_event_types()
RETURNS TABLE (
  workflow_id   UUID,
  workflow_name TEXT,
  instance_name TEXT,
  event_type    TEXT,
  cnt           BIGINT
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT
    e.workflow_id,
    w.name,
    i.name,
    e.event_type,
    count(*) AS cnt
  FROM public.n8n_executions e
  JOIN public.n8n_workflows w ON w.id = e.workflow_id
  JOIN public.n8n_instances i ON i.id = e.instance_id
  WHERE e.event_type IS NOT NULL
    AND e.event_type <> ''
    AND NOT EXISTS (
      SELECT 1 FROM public.event_types et
      WHERE et.workflow_id = e.workflow_id
        AND lower(et.key) = lower(e.event_type)
    )
  GROUP BY e.workflow_id, w.name, i.name, e.event_type
  ORDER BY count(*) DESC;
$$;
