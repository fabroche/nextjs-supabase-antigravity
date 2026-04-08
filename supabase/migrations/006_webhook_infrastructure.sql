-- ============================================================
-- Sprint 3: Infraestructura de Webhooks
-- ============================================================

-- Configuración de fuentes de webhook
CREATE TABLE webhook_sources (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  source     TEXT        UNIQUE NOT NULL,
  secret     TEXT,
  is_active  BOOLEAN     DEFAULT true,
  config     JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Dead letter queue: webhooks que fallaron al procesarse
CREATE TABLE webhook_dead_letters (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  source     TEXT        NOT NULL,
  payload    JSONB       NOT NULL,
  error      TEXT,
  headers    JSONB,
  retries    INTEGER     DEFAULT 0,
  resolved   BOOLEAN     DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed inicial de fuentes (secrets se configuran después por ENV o panel)
INSERT INTO webhook_sources (source, is_active) VALUES
  ('telegram', true),
  ('dokploy',  true),
  ('notion',   true),
  ('n8n',      true);

-- Columnas de identidad por plataforma en user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS telegram_id       TEXT UNIQUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS notion_person_id  TEXT UNIQUE;
