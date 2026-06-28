-- Migration 019: Catálogo gobernado de event_type (Sprint 5 — PR2, Opción B)
-- Convierte event_type de texto libre a vocabulario controlado, fuente de verdad única
-- consumida por N8N (vía GET /api/event-types) y por el dashboard.
--   - event_types       → catálogo de tipos válidos por workflow (business | system)
--   - event_type_rules  → mapeo tool → event_type (el Code node de N8N deja de hardcodearlo)
-- Rollback: rollback_019_event_type_catalog.sql

-- ============================================================
-- 1. Tabla: event_types (catálogo por workflow)
-- ============================================================
CREATE TABLE public.event_types (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID        NOT NULL REFERENCES public.n8n_workflows(id) ON DELETE CASCADE,
  key         TEXT        NOT NULL,                          -- canónico, ej. 'Cita_Confirmada'
  label       TEXT,
  category    TEXT        NOT NULL DEFAULT 'business' CHECK (category IN ('business','system')),
  status      TEXT        NOT NULL DEFAULT 'active'   CHECK (status IN ('active','pending','archived')),
  is_default  BOOLEAN     NOT NULL DEFAULT false,            -- tipo por defecto del workflow
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (workflow_id, key)
);

CREATE INDEX idx_event_types_workflow ON public.event_types(workflow_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.event_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage event_types"
  ON public.event_types FOR ALL
  USING ((SELECT public.is_admin()));

CREATE POLICY "Owners can view own event_types"
  ON public.event_types FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.n8n_workflows w
      JOIN public.n8n_instances i ON i.id = w.instance_id
      JOIN public.businesses b    ON b.id = i.business_id
      WHERE w.id = event_types.workflow_id
        AND b.owner_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- 2. Tabla: event_type_rules (mapeo tool → event_type)
-- ============================================================
CREATE TABLE public.event_type_rules (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id    UUID        NOT NULL REFERENCES public.n8n_workflows(id) ON DELETE CASCADE,
  tool_pattern   TEXT        NOT NULL,                       -- ej. 'Reservar_Cita'
  event_type_key TEXT        NOT NULL,
  priority       INT         NOT NULL DEFAULT 100,           -- menor = se evalúa primero
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (workflow_id, tool_pattern)
);

CREATE INDEX idx_event_type_rules_workflow ON public.event_type_rules(workflow_id);

ALTER TABLE public.event_type_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage event_type_rules"
  ON public.event_type_rules FOR ALL
  USING ((SELECT public.is_admin()));

CREATE POLICY "Owners can view own event_type_rules"
  ON public.event_type_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.n8n_workflows w
      JOIN public.n8n_instances i ON i.id = w.instance_id
      JOIN public.businesses b    ON b.id = i.business_id
      WHERE w.id = event_type_rules.workflow_id
        AND b.owner_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- 3. Seed: catálogo + reglas del Agente Agendador de Gipsy
--    Workflow real: n8n-gipsy / cZw0Wjno07VgtmmJ ("Update 1.2")
--    Se resuelve el UUID por sub-select (no-op si el workflow no existe).
-- ============================================================
WITH wf AS (
  SELECT w.id
  FROM public.n8n_workflows w
  JOIN public.n8n_instances i ON i.id = w.instance_id
  WHERE i.instance_id = 'n8n-gipsy'
    AND w.workflow_id = 'cZw0Wjno07VgtmmJ'
  LIMIT 1
)
INSERT INTO public.event_types (workflow_id, key, label, category, status, is_default)
SELECT wf.id, v.key, v.label, v.category, 'active', v.is_default
FROM wf, (VALUES
  ('Mensaje_Respondido',      'Mensaje respondido',       'business', true),
  ('Consulta_Servicios',      'Consulta de servicios',    'business', false),
  ('Consulta_Disponibilidad', 'Consulta de disponibilidad','business', false),
  ('Consulta_Citas',          'Consulta de citas',        'business', false),
  ('Cita_Confirmada',         'Cita confirmada',          'business', false),
  ('Cancelacion',             'Cancelación',              'business', false),
  ('Reprogramacion',          'Reprogramación',           'business', false),
  ('workflow_error',          'Error de workflow',        'system',   false)
) AS v(key, label, category, is_default)
ON CONFLICT (workflow_id, key) DO NOTHING;

WITH wf AS (
  SELECT w.id
  FROM public.n8n_workflows w
  JOIN public.n8n_instances i ON i.id = w.instance_id
  WHERE i.instance_id = 'n8n-gipsy'
    AND w.workflow_id = 'cZw0Wjno07VgtmmJ'
  LIMIT 1
)
INSERT INTO public.event_type_rules (workflow_id, tool_pattern, event_type_key, priority)
SELECT wf.id, v.tool_pattern, v.event_type_key, v.priority
FROM wf, (VALUES
  ('Reservar_Cita',            'Cita_Confirmada',         10),
  ('Cancelar',                 'Cancelacion',             20),
  ('Reprogramar',              'Reprogramacion',          30),
  ('Consultar_Servicios',      'Consulta_Servicios',      40),
  ('Consultar_Disponibilidad', 'Consulta_Disponibilidad', 50),
  ('Consultar_Citas',          'Consulta_Citas',          60)
) AS v(tool_pattern, event_type_key, priority)
ON CONFLICT (workflow_id, tool_pattern) DO NOTHING;
