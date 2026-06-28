-- Rollback Migration 019: elimina el catálogo gobernado de event_type

DROP TABLE IF EXISTS public.event_type_rules;
DROP TABLE IF EXISTS public.event_types;
