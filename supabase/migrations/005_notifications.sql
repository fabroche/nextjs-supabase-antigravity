-- ============================================================
-- Sprint 3: Notificaciones y Activity Feed
-- ============================================================

-- Feed de actividad general (todos los eventos de todas las fuentes)
CREATE TABLE activity_feed (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  source      TEXT        NOT NULL,
  event_type  TEXT        NOT NULL,
  actor       TEXT        NOT NULL,
  action      TEXT        NOT NULL,
  description TEXT        NOT NULL,
  channel     TEXT,
  metadata    JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Notificaciones personales por usuario
CREATE TABLE notifications (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source      TEXT        NOT NULL,
  event_type  TEXT        NOT NULL,
  actor       TEXT        NOT NULL,
  action      TEXT        NOT NULL,
  description TEXT        NOT NULL,
  channel     TEXT,
  metadata    JSONB       DEFAULT '{}',
  read        BOOLEAN     DEFAULT false,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Índices de rendimiento
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_activity_feed_created ON activity_feed(created_at DESC);
CREATE INDEX idx_activity_feed_source ON activity_feed(source);

-- RLS: notifications — cada usuario solo ve las suyas
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS: activity_feed — visible para todos los usuarios autenticados
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users see activity feed"
  ON activity_feed FOR SELECT
  USING (auth.role() = 'authenticated');

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE activity_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
