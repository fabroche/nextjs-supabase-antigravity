# Realtime: Activity Feed y Notificaciones

## useActivityFeed (`hooks/use-activity-feed.ts`)

Suscripción a `activity_feed` via Supabase Realtime:
- **INSERT** → prepend al array de eventos (más reciente primero)
- **UPDATE** → merge in-place por `id` — crítico para el enrichment de N8N
- Carga inicial: `fetchActivityFeed(50)` al montar
- Expone `{ events, isConnected }`

```typescript
.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_feed' }, ...)
.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'activity_feed' }, ...)
```

## useNotifications (`hooks/use-notifications.ts`)

- Solo escucha INSERTs filtrados por `user_id = auth.uid()`
- Maneja unread count
- Expone `{ notifications, unreadCount, markAsRead, markAllAsRead }`

## ActivityFeed Component (`components/dashboard/activity-feed.tsx`)

### Skeleton de enrichment

Cuando un evento N8N tiene `metadata.enrichment_pending === true`, muestra skeleton inline:

```tsx
{showSkeleton && (
  <span className="ml-2 inline-flex items-center gap-1.5 align-middle">
    <Skeleton className="h-3.5 w-28" />
    <span className="text-xs text-muted-foreground italic">Calculando costo…</span>
  </span>
)}
```

El Realtime UPDATE llegará con `enrichment_pending=false` y la description actualizada con el costo. El hook de UPDATE merge el evento → skeleton desaparece.

### Escape timer (useEnrichmentEscape)

Timer de **15 segundos** por evento con `enrichment_pending=true`. Si el UPDATE de Realtime nunca llega (drop silencioso, error en backend), el skeleton desaparece solo. Evita estados colgados.

```typescript
const ENRICHMENT_TIMEOUT_MS = 15_000
```

### Severity styles

```typescript
success: 'border-l-2 border-l-green-500 bg-green-500/5 pl-3 pr-2 py-1.5 rounded-r-md'
warning: 'border-l-2 border-l-yellow-500 bg-yellow-500/5 ...'
error:   'border-l-2 border-l-destructive bg-destructive/5 ...'
```

## NotificationBell (`components/notifications/notification-bell.tsx`)

- Icono con badge rojo (número de unread, max "9+")
- Dropdown con lista + "marcar todas como leídas"
- Cada item: icono del source, description, tiempo relativo

## Source Icons

```typescript
const SOURCE_ICONS = {
  telegram: '✈️',
  dokploy: '🚀',
  notion: '📝',
  n8n: '⚡',
}
```

## Requisito Crítico

`REPLICA IDENTITY FULL` debe estar activo en `activity_feed` (migración 009). Sin esto, Supabase Realtime descarta UPDATEs silenciosamente en tablas con RLS — el enriquecimiento ocurre en DB pero el frontend nunca lo recibe.
