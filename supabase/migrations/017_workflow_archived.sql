-- Migration 017: archived_at en n8n_workflows + RPC reassign_workflow
-- Permite archivar workflows (soft-delete) y reasignarlos a otra instancia
-- de forma atómica (workflow + todas sus ejecuciones históricas).

-- 1. Nueva columna
ALTER TABLE public.n8n_workflows
  ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Actualizar vista para excluir workflows archivados
CREATE OR REPLACE VIEW public.n8n_workflow_stats AS
SELECT
  w.id,
  w.instance_id,
  w.workflow_id,
  w.name,
  w.is_active,
  w.tags,
  COUNT(e.id)                                                    AS total_executions,
  COUNT(e.id) FILTER (WHERE e.status = 'success')                AS success_count,
  COUNT(e.id) FILTER (WHERE e.status = 'error')                  AS error_count,
  ROUND(
    CASE WHEN COUNT(e.id) > 0
      THEN COUNT(e.id) FILTER (WHERE e.status = 'error')::NUMERIC / COUNT(e.id) * 100
      ELSE 0
    END, 1
  )                                                              AS error_rate,
  COALESCE(SUM(e.tokens_prompt + e.tokens_completion), 0)        AS total_tokens,
  COALESCE(SUM(e.cost_usd), 0)                                   AS total_cost,
  ROUND(AVG(e.duration_ms))                                      AS avg_duration_ms,
  MAX(e.created_at)                                              AS last_execution_at
FROM public.n8n_workflows w
LEFT JOIN public.n8n_executions e
  ON e.workflow_id = w.id
  AND e.created_at >= NOW() - INTERVAL '30 days'
WHERE w.archived_at IS NULL
GROUP BY w.id, w.instance_id, w.workflow_id, w.name, w.is_active, w.tags;

-- 3. RPC: reasigna workflow + ejecuciones históricas en una sola transacción
CREATE OR REPLACE FUNCTION public.reassign_workflow(
  p_workflow_id     UUID,
  p_new_instance_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.n8n_workflows
    SET instance_id = p_new_instance_id,
        updated_at  = NOW()
  WHERE id = p_workflow_id;

  UPDATE public.n8n_executions
    SET instance_id = p_new_instance_id
  WHERE workflow_id = p_workflow_id;
END;
$$;
