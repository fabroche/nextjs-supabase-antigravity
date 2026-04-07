# Sprint 3 — Plan de Implementación: Sistema de Notificaciones en Tiempo Real con Webhooks

> **Estado**: Pendiente  
> **Dependencia**: Sprint 2 debe estar completado ✅  
> **Versión objetivo**: 0.6.0  
> **Fecha de creación**: 2026-04-07

---

## Objetivo

Implementar un sistema de notificaciones en tiempo real conectado a servicios externos via
webhooks. Los eventos de Telegram, Dokploy, Notion y N8N se reciben, normalizan y propagan
al frontend usando Supabase Realtime. El usuario ve un feed de actividad general y
notificaciones personales con badge de no-leídas en el header.

---

## Adaptaciones al Proyecto Actual

> **Importante**: Esta idea fue diseñada de forma genérica. Las siguientes decisiones la adaptan
> a la arquitectura real del proyecto.

| Diferencia encontrada | Decisión de adaptación |
|----------------------|----------------------|
| La idea usa Prisma como ORM | El proyecto usa Supabase directo — **no instalar Prisma** |
| La idea crea tabla `profiles` | El proyecto ya tiene `user_profiles` — **agregar columnas ahí** |
| La idea importa desde `supabase-admin` | Crear `src/lib/supabase/admin.ts` con service_role key |
| La idea importa desde `supabase-client` | Ya existe `src/lib/supabase/client.ts` — usar ese |
| La idea crea `hooks/` en raíz | Crear `src/hooks/` (no existe aún) |
| La idea define `NormalizedEvent` en `types.ts` aparte | Agregar a `src/lib/supabase/types.ts` (patron existente) |
| La idea define queries inline en hooks | Agregar a `src/lib/supabase/queries.ts` (patron existente) |
| La campana de notificaciones "hidden for v0" | Ya está contemplada en `claude.md` — solo hay que habilitarla |
| `recent-activity.tsx` existe pero está sin usar | Evaluar en Fase 3 si se reutiliza o coexiste con ActivityFeed |

---

## Inventario de lo que ya existe

| Recurso | Estado | Notas |
|---------|--------|-------|
| `src/lib/supabase/client.ts` | ✅ Listo | Browser client — usar en hooks |
| `src/lib/supabase/server.ts` | ✅ Listo | Server client — NO usar en webhooks |
| `src/lib/supabase/types.ts` | ✅ Listo | Agregar `NormalizedEvent`, `DbActivityFeed`, `DbNotification` |
| `src/lib/supabase/queries.ts` | ✅ Listo | Agregar queries de notifications |
| `src/contexts/auth-context.tsx` | ✅ Listo | Provee `user.id` para `useNotifications` |
| `src/components/dashboard/header.tsx` | ✅ Listo | Agregar `<NotificationBell>` entre ThemeToggle y Avatar |
| `src/components/dashboard/recent-activity.tsx` | ⚠️ Existe sin usar | Evaluar en Fase 3 |
| `src/hooks/` | ❌ No existe | Crear directorio |
| `src/lib/supabase/admin.ts` | ❌ No existe | Crear (service_role) |
| `src/app/api/` | ❌ No existe | Crear directorio con webhooks |
| `supabase/migrations/005_*.sql` | ❌ No existe | Crear migraciones |

---

## Arquitectura

```
Telegram / Dokploy / Notion / N8N
         │
         ▼
POST /api/webhooks/[source]          ← src/app/api/webhooks/[source]/route.ts
  ├── Valida firma/secret
  ├── Responde 200 OK inmediatamente
  └── processWebhook() en background (fire-and-forget)
        ├── normalizeEvent() → NormalizedEvent
        ├── INSERT activity_feed
        ├── Si target_user_id → INSERT notifications
        └── Si falla → INSERT webhook_dead_letters
                │
                ▼
         Supabase DB
    activity_feed | notifications
                │
                ▼ Supabase Realtime
         Frontend React
    useActivityFeed | useNotifications
    ActivityFeed    | NotificationBell (header)
```

> **Fire-and-forget funciona porque el proyecto se despliega en Dokploy** (servidor Node.js
> persistente). Si en el futuro se migra a Vercel serverless, este patron necesitaría una cola
> (Inngest, QStash o Supabase Edge Function).

---

## Estructura de Archivos Nuevos

```
src/
├── app/
│   └── api/
│       └── webhooks/
│           └── [source]/
│               └── route.ts               ← Endpoint dinámico por fuente
│           └── _lib/
│               ├── validators.ts          ← Validación de firmas HMAC
│               ├── normalizers.ts         ← Transformación de payloads
│               └── types.ts               ← NormalizedEvent (local al endpoint)
├── components/
│   ├── notifications/
│   │   ├── notification-bell.tsx          ← Campana con badge en header
│   │   └── notification-item.tsx          ← Item individual de la lista
│   └── dashboard/
│       └── activity-feed.tsx              ← Feed de actividad en tiempo real
├── hooks/
│   ├── use-activity-feed.ts               ← Hook Realtime para activity_feed
│   └── use-notifications.ts              ← Hook Realtime para notifications
└── lib/
    └── supabase/
        └── admin.ts                       ← Cliente service_role (solo backend)
```

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/lib/supabase/types.ts` | Agregar `DbActivityFeed`, `DbNotification` |
| `src/lib/supabase/queries.ts` | Agregar `markNotificationRead`, `markAllNotificationsRead` |
| `src/components/dashboard/header.tsx` | Agregar `<NotificationBell>` |
| `src/app/layout.tsx` | Verificar que `AuthProvider` envuelve toda la app |
| `supabase/migrations/` | Agregar `005_notifications.sql` y `006_webhook_infrastructure.sql` |
| `claude.md` | Actualizar al completar |

---

## Migraciones de Base de Datos

### `supabase/migrations/005_notifications.sql`

```sql
-- ============================================================
-- Notificaciones y Activity Feed
-- ============================================================

-- Feed de actividad general (todos los eventos de todas las fuentes)
CREATE TABLE activity_feed (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  source      TEXT        NOT NULL,                    -- telegram, dokploy, notion, n8n
  event_type  TEXT        NOT NULL,                    -- message.reply, deploy.success, etc.
  actor       TEXT        NOT NULL,                    -- quién realizó la acción
  action      TEXT        NOT NULL,                    -- verbo corto: respondió, desplegó, creó
  description TEXT        NOT NULL,                    -- texto legible para el feed
  channel     TEXT,                                    -- contexto: canal, proyecto, servidor
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
```

### `supabase/migrations/006_webhook_infrastructure.sql`

```sql
-- ============================================================
-- Infraestructura de Webhooks
-- ============================================================

-- Configuración de fuentes de webhook (gestión dinámica de secrets)
CREATE TABLE webhook_sources (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  source     TEXT        UNIQUE NOT NULL,              -- telegram, dokploy, notion, n8n
  secret     TEXT,                                     -- secret/token para validar firmas
  is_active  BOOLEAN     DEFAULT true,
  config     JSONB       DEFAULT '{}',                 -- config específica por fuente
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

-- RLS: webhook_sources y dead_letters solo accesibles via service_role (backend)
-- No se habilita RLS con políticas públicas — el acceso es exclusivamente desde
-- el endpoint de webhook usando la SUPABASE_SERVICE_ROLE_KEY

-- Seed inicial de fuentes (insertar secrets después por ENV o panel)
INSERT INTO webhook_sources (source, is_active) VALUES
  ('telegram', true),
  ('dokploy',  true),
  ('notion',   true),
  ('n8n',      true);

-- Identidad por plataforma en user_profiles (mapeo de usuarios entre servicios)
-- Nota: esta tabla ya existe como user_profiles en este proyecto
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS telegram_id       TEXT UNIQUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS notion_person_id  TEXT UNIQUE;
-- Futuras integraciones:
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS discord_id TEXT UNIQUE;
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS github_username TEXT UNIQUE;
```

> **Nota sobre `user_profiles`**: El proyecto ya tiene esta tabla (creada en `001_foundation.sql`).
> Se agregan columnas de identidad ahí en lugar de crear una tabla de mapeo separada.
> Los usuarios vinculan sus IDs desde un panel de Settings (Fase 5).

---

## Variables de Entorno a Agregar en `.env.local`

```bash
# Service role key — NUNCA exponer al cliente, solo usar en API routes
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Notion
NOTION_API_KEY=ntn_...
NOTION_WEBHOOK_SECRET=tu-secret
NOTION_SPRINT_DB_ID=abc123...          # ID de la base de datos Sprint en Notion

# Telegram (el secret se puede guardar en webhook_sources o en ENV)
TELEGRAM_WEBHOOK_SECRET=tu-secret

# Dokploy
DOKPLOY_WEBHOOK_SECRET=tu-secret

# N8N
N8N_WEBHOOK_SECRET=tu-secret
```

---

## Implementación Detallada

### Paso 1 — `src/lib/supabase/admin.ts` (nuevo)

```typescript
// Cliente Supabase con service_role — SOLO usar en API routes (backend)
// Nunca importar desde componentes cliente o hooks
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

---

### Paso 2 — Tipos en `src/lib/supabase/types.ts` (agregar al final)

```typescript
// Table: activity_feed
export interface DbActivityFeed {
  id: string
  source: string
  event_type: string
  actor: string
  action: string
  description: string
  channel: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// Table: notifications
export interface DbNotification {
  id: string
  user_id: string
  source: string
  event_type: string
  actor: string
  action: string
  description: string
  channel: string | null
  metadata: Record<string, unknown>
  read: boolean
  read_at: string | null
  created_at: string
}
```

---

### Paso 3 — Queries en `src/lib/supabase/queries.ts` (agregar al final)

```typescript
import type { DbActivityFeed, DbNotification } from './types'

export async function fetchActivityFeed(limit = 50): Promise<DbActivityFeed[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('activity_feed')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function fetchNotifications(userId: string, limit = 30): Promise<DbNotification[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
  if (error) throw error
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('read', false)
  if (error) throw error
}
```

---

### Paso 4 — Hooks de Realtime

**`src/hooks/use-activity-feed.ts`**

```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchActivityFeed } from '@/lib/supabase/queries'
import type { DbActivityFeed } from '@/lib/supabase/types'

export function useActivityFeed(limit = 50) {
  const [events, setEvents] = useState<DbActivityFeed[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    fetchActivityFeed(limit).then(setEvents).catch(console.error)

    const channel = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_feed' },
        (payload) => {
          setEvents((prev) => [payload.new as DbActivityFeed, ...prev].slice(0, limit))
        }
      )
      .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel) }
  }, [limit])

  return { events, isConnected }
}
```

**`src/hooks/use-notifications.ts`**

```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/supabase/queries'
import type { DbNotification } from '@/lib/supabase/types'

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<DbNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!userId) return
    const supabase = createClient()

    fetchNotifications(userId).then((data) => {
      setNotifications(data)
      setUnreadCount(data.filter((n) => !n.read).length)
    }).catch(console.error)

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as DbNotification, ...prev])
          setUnreadCount((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const handleMarkAllRead = async () => {
    if (!userId) return
    await markAllNotificationsRead(userId)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  return { notifications, unreadCount, markAsRead: handleMarkRead, markAllAsRead: handleMarkAllRead }
}
```

---

### Paso 5 — Endpoint de Webhooks

**`src/app/api/webhooks/_lib/types.ts`**

```typescript
export interface NormalizedEvent {
  source: string
  event_type: string
  actor: string
  action: string
  description: string
  channel?: string
  target_user_id?: string | null
  metadata?: Record<string, unknown>
}
```

**`src/app/api/webhooks/_lib/validators.ts`**

```typescript
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function validateWebhook(
  source: string,
  rawBody: string,
  headers: Record<string, string>
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('webhook_sources')
    .select('secret')
    .eq('source', source)
    .eq('is_active', true)
    .single()

  if (!data?.secret) return false

  switch (source) {
    case 'telegram':
      return headers['x-telegram-bot-api-secret-token'] === data.secret

    case 'dokploy': {
      const sig = headers['x-dokploy-signature']
      const expected = 'sha256=' + crypto.createHmac('sha256', data.secret).update(rawBody).digest('hex')
      return sig === expected
    }

    case 'notion': {
      const sig = headers['x-notion-signature']
      const expected = crypto.createHmac('sha256', data.secret).update(rawBody).digest('hex')
      try {
        return crypto.timingSafeEqual(Buffer.from(sig || ''), Buffer.from(expected))
      } catch {
        return false
      }
    }

    case 'n8n':
      return headers['x-n8n-webhook-secret'] === data.secret

    default:
      return false
  }
}
```

**`src/app/api/webhooks/_lib/normalizers.ts`**

Ver implementación completa en la idea original — es compatible con el proyecto tal como está,
con un ajuste: en `normalizeTelegram` y `normalizeNotion` la importación de `supabase` debe
ser `supabaseAdmin` desde `@/lib/supabase/admin`.

```typescript
// Ajuste clave en normalizers.ts — importar admin client
import { supabaseAdmin } from '@/lib/supabase/admin'

// Buscar en user_profiles (no en profiles)
const { data: profile } = await supabaseAdmin
  .from('user_profiles')          // ← nombre correcto en este proyecto
  .select('id')
  .eq('telegram_id', telegramId)
  .single()
```

**`src/app/api/webhooks/[source]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { validateWebhook } from '../_lib/validators'
import { normalizeEvent } from '../_lib/normalizers'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  const { source } = await params
  const body = await req.text()
  const headers = Object.fromEntries(req.headers)

  const isValid = await validateWebhook(source, body, headers)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(body)

  // Fire-and-forget: responder 200 antes de procesar
  processWebhook(source, payload, headers).catch(console.error)

  return NextResponse.json({ ok: true })
}

async function processWebhook(
  source: string,
  payload: unknown,
  headers: Record<string, string>
) {
  try {
    const event = await normalizeEvent(source, payload)
    if (!event) return

    const { error: feedError } = await supabaseAdmin
      .from('activity_feed')
      .insert({
        source: event.source,
        event_type: event.event_type,
        actor: event.actor,
        action: event.action,
        description: event.description,
        channel: event.channel ?? null,
        metadata: event.metadata ?? {},
      })
    if (feedError) throw feedError

    if (event.target_user_id) {
      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: event.target_user_id,
          source: event.source,
          event_type: event.event_type,
          actor: event.actor,
          action: event.action,
          description: event.description,
          channel: event.channel ?? null,
          metadata: event.metadata ?? {},
        })
      if (notifError) throw notifError
    }
  } catch (error) {
    await supabaseAdmin.from('webhook_dead_letters').insert({
      source,
      payload,
      error: (error as Error).message,
      headers,
    })
  }
}
```

> **Nota Next.js 15+**: `params` en App Router es ahora una `Promise`. Usar `await params`.

---

### Paso 6 — Componentes de Notificaciones

**`src/components/notifications/notification-bell.tsx`**

```tsx
'use client'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotifications } from '@/hooks/use-notifications'
import { useAuth } from '@/contexts/auth-context'
import { NotificationItem } from './notification-item'

export function NotificationBell() {
  const { user } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(user?.id)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Marcar todas como leídas
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sin notificaciones
            </p>
          ) : (
            notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} onRead={markAsRead} />
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**`src/components/notifications/notification-item.tsx`**

```tsx
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { DbNotification } from '@/lib/supabase/types'

const SOURCE_ICONS: Record<string, string> = {
  telegram: '✈️',
  dokploy: '🚀',
  notion: '📝',
  n8n: '⚡',
}

interface NotificationItemProps {
  notification: DbNotification
  onRead: (id: string) => void
}

export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  return (
    <button
      onClick={() => !notification.read && onRead(notification.id)}
      className={cn(
        'flex w-full gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50',
        !notification.read && 'bg-muted/30'
      )}
    >
      <span className="text-base leading-none mt-0.5">
        {SOURCE_ICONS[notification.source] ?? '🔔'}
      </span>
      <div className="flex-1 space-y-1 overflow-hidden">
        <p className={cn('line-clamp-2 leading-snug', !notification.read && 'font-medium')}>
          {notification.description}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
        </p>
      </div>
      {!notification.read && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  )
}
```

---

### Paso 7 — Habilitar campana en `header.tsx`

Agregar import y componente entre `<ThemeToggle />` y el `<DropdownMenu>` del avatar:

```tsx
// Agregar import
import { NotificationBell } from '@/components/notifications/notification-bell'

// Agregar en el JSX, entre ThemeToggle y el avatar dropdown
<ThemeToggle />
<NotificationBell />   {/* ← agregar aquí */}
<DropdownMenu>
  {/* ... avatar dropdown existente sin cambios */}
</DropdownMenu>
```

---

### Paso 8 — Activity Feed en dashboard (Fase 3)

**`src/components/dashboard/activity-feed.tsx`**

Crear componente que usa `useActivityFeed()` y muestra el feed en tiempo real.
Evaluar si reemplaza o convive con `recent-activity.tsx` (que actualmente no se usa).
Decisión recomendada: **reemplazar** `recent-activity.tsx` con `activity-feed.tsx`
ya que la funcionalidad es un superset de la que estaba planificada.

Integrar en `page.tsx` como nueva sección debajo del chart (tab Resumen) o como tab propia
si el volumen de eventos lo justifica. Decidir al momento de la implementación.

---

## Configuración de Webhooks por Servicio

### Telegram
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://tu-dominio.com/api/webhooks/telegram", "secret_token": "tu-secret" }'
```

### Dokploy
Panel de Dokploy → Settings → Webhooks → URL: `https://tu-dominio.com/api/webhooks/dokploy`

### Notion
1. [notion.so/my-integrations](https://www.notion.so/my-integrations) → tu integración → pestaña Webhooks
2. URL: `https://tu-dominio.com/api/webhooks/notion`
3. Los payloads son **sparse** (solo IDs) — el normalizer hace un fetch de seguimiento a la API
4. Validar siempre `X-Notion-Signature` en producción

### N8N
Nodo HTTP Request al final de cada workflow relevante → POST a `https://tu-dominio.com/api/webhooks/n8n`

---

## Orden de Implementación

| Fase | Tareas | Descripción |
|------|--------|-------------|
| **Fase 1** | Migraciones | Ejecutar `005_notifications.sql` y `006_webhook_infrastructure.sql` en Supabase |
| **Fase 1** | Admin client | Crear `src/lib/supabase/admin.ts` |
| **Fase 1** | ENV vars | Agregar `SUPABASE_SERVICE_ROLE_KEY` y secrets de cada servicio |
| **Fase 2** | Backend webhook | Crear endpoint `/api/webhooks/[source]/route.ts` + validators + normalizers |
| **Fase 2** | Primer test | Integrar Telegram, probar flujo completo con ngrok en local |
| **Fase 3** | Hooks | Crear `src/hooks/use-notifications.ts` y `use-activity-feed.ts` |
| **Fase 3** | Componentes | `notification-bell.tsx`, `notification-item.tsx`, `activity-feed.tsx` |
| **Fase 3** | Header | Descomentar/agregar `<NotificationBell>` en `header.tsx` |
| **Fase 4** | Más integraciones | Normalizers para Dokploy, Notion y N8N |
| **Fase 4** | Notion fetch | Implementar fetch de seguimiento a API de Notion (payloads sparse) |
| **Fase 5** | Settings | Panel para que usuarios vinculen `telegram_id` y `notion_person_id` |
| **Fase 5** | Dead letters | Vista de admin para revisar webhooks fallidos |
| **Fase 5** | Limpieza | Purge automático de events viejos (Supabase cron o pg_cron) |

---

## Criterios de Aceptación

- [ ] Migraciones ejecutadas sin errores en Supabase
- [ ] `POST /api/webhooks/telegram` recibe, valida y persiste eventos
- [ ] Evento de Telegram aparece en `activity_feed` sin recargar el frontend (Realtime)
- [ ] Respuesta a mensaje de Telegram genera notificación personal al usuario correcto
- [ ] Badge de campana muestra número de no-leídas
- [ ] Click en notificación la marca como leída (badge decrece)
- [ ] "Marcar todas como leídas" limpia el badge
- [ ] Deploy de Dokploy aparece en el feed
- [ ] Tarea asignada en Notion genera notificación al responsable
- [ ] Webhook inválido (firma incorrecta) devuelve 401 y no persiste nada
- [ ] Webhook fallido se guarda en `webhook_dead_letters`
- [ ] `npm run build` sin errores

---

## Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Supabase Realtime no activo en las tablas | Frontend no recibe eventos | Verificar `ALTER PUBLICATION` ejecutado correctamente |
| `SUPABASE_SERVICE_ROLE_KEY` expuesta al cliente | Brecha de seguridad | `admin.ts` solo importado desde API routes, nunca desde componentes |
| Payloads sparse de Notion tardan en resolverse | Timeouts en background | Fire-and-forget ya resuelve esto; agregar timeout al fetch de Notion API |
| telegram_id / notion_person_id no configurados | Notificaciones sin destinatario | El evento igual se guarda en activity_feed; notificación simplemente no se crea |
| Fire-and-forget falla silenciosamente | Se pierden eventos | Dead letter queue captura todos los errores del processWebhook |
| Migración a Vercel en el futuro | Fire-and-forget deja de funcionar | Documentado; migrar a Inngest o Supabase Edge Function en ese momento |

---

## Dependencias a Instalar

```bash
# date-fns ya debería estar instalado como peer dep de react-day-picker (Sprint 2)
# Verificar que esté disponible:
npm ls date-fns

# Si no está:
npm install date-fns
```

No se requieren nuevas dependencias de UI — todos los componentes necesarios (`Button`, `DropdownMenu`, `Bell` de lucide) ya están instalados.

---

_Fecha de creación: 2026-04-07_  
_Sprint: 3_  
_Versión objetivo: 0.6.0_  
_Dependencia: Sprint 2 completado_
