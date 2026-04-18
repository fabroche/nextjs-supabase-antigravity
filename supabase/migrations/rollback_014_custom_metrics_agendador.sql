-- Rollback migration 014

DROP FUNCTION IF EXISTS public.get_workflow_mensajes_respondidos(UUID, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.get_workflow_citas_confirmadas(UUID, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.get_workflow_cancelaciones(UUID, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.get_workflow_consultas_disponibilidad(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

DELETE FROM public.custom_metrics
WHERE slug IN ('mensajes-respondidos', 'citas-confirmadas', 'cancelaciones', 'consultas-disponibilidad')
  AND workflow_id = '9f362d0d-7d40-4df2-88b3-1c8d64aba169';
