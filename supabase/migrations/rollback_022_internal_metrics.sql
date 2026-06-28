-- Rollback Migration 022: revierte métricas internas + generalización del motor

DELETE FROM public.custom_metrics WHERE slug LIKE 'agendador-int-%';

DROP FUNCTION IF EXISTS public.metric_agg(UUID, JSONB, TIMESTAMPTZ, TIMESTAMPTZ);

ALTER TABLE public.custom_metrics DROP COLUMN IF EXISTS audience;

-- Nota: compute_metric y metric_build_where quedan en su versión generalizada (022).
-- Para volver a la 020, re-ejecutar el cuerpo de esas funciones desde 020_metric_engine.sql.
