-- Rollback Migration 020: revierte el motor de métricas configurable
-- (No restaura los seeds/funciones de la 014 — re-ejecutar 014 si se necesita.)

DELETE FROM public.custom_metrics WHERE slug LIKE 'agendador-%';

DROP FUNCTION IF EXISTS public.compute_metric(UUID, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.metric_build_where(UUID, JSONB, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN);

ALTER TABLE public.custom_metrics DROP COLUMN IF EXISTS config;

ALTER TABLE public.custom_metrics
  DROP CONSTRAINT IF EXISTS custom_metrics_metric_type_check;
ALTER TABLE public.custom_metrics
  ADD CONSTRAINT custom_metrics_metric_type_check
  CHECK (metric_type IN ('count','sum','avg','ratio'));
