-- Migration 018: chat_id + is_out_of_hours en n8n_executions
-- El Metric Logger envía chat_id (cliente) e is_out_of_hours por evento, pero hasta ahora
-- solo se guardaban en activity_feed.metadata. Las métricas del agendador se calculan sobre
-- n8n_executions, así que se persisten como columnas de primera clase:
--   - chat_id          → Clientes_Atendidos (COUNT DISTINCT chat_id)
--   - is_out_of_hours  → Interacciones_Fuera_Horario / Citas_Confirmadas_FH (filtro)
-- Sprint 5 — PR1. Rollback: rollback_018_executions_business_fields.sql

-- 1. Columnas (nullable, sin default → ADD COLUMN instantáneo, sin reescritura de tabla)
ALTER TABLE public.n8n_executions
  ADD COLUMN IF NOT EXISTS chat_id        TEXT,
  ADD COLUMN IF NOT EXISTS is_out_of_hours BOOLEAN;

-- 2. Índice para COUNT DISTINCT chat_id por instancia (clientes únicos)
CREATE INDEX IF NOT EXISTS idx_n8n_executions_chat_id
  ON public.n8n_executions(instance_id, chat_id)
  WHERE chat_id IS NOT NULL;

-- 3. Backfill desde activity_feed.metadata (filas históricas, incl. las 218 recuperadas).
--    Se cruza por instancia (string instance_id → UUID) + execution_id, porque execution_id
--    es único por instancia, no global. DISTINCT ON toma la fila de feed más reciente por par.
UPDATE public.n8n_executions e
SET chat_id        = sub.chat_id,
    is_out_of_hours = sub.is_out_of_hours
FROM (
  SELECT DISTINCT ON (i.id, af.metadata->>'execution_id')
    i.id                                AS instance_uuid,
    af.metadata->>'execution_id'        AS execution_id,
    NULLIF(af.metadata->>'chat_id', '') AS chat_id,
    CASE
      WHEN lower(af.metadata->>'is_out_of_hours') = 'true'  THEN true
      WHEN lower(af.metadata->>'is_out_of_hours') = 'false' THEN false
      ELSE NULL
    END                                 AS is_out_of_hours
  FROM public.activity_feed af
  JOIN public.n8n_instances i ON i.instance_id = af.metadata->>'instance_id'
  WHERE af.source = 'n8n' AND af.metadata ? 'execution_id'
  ORDER BY i.id, af.metadata->>'execution_id', af.created_at DESC
) sub
WHERE e.instance_id = sub.instance_uuid
  AND e.execution_id = sub.execution_id
  AND e.chat_id IS NULL;
