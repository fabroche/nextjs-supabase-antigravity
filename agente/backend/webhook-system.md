# Sistema de Webhooks

## Endpoint

`POST /api/webhooks/[source]` — ruta dinámica en `src/app/api/webhooks/[source]/route.ts`

Flujo:
1. Lee body como texto crudo
2. `validateWebhook(source, body, headers)` — retorna false → 401
3. Parsea JSON (o construye objeto desde headers para ntfy/plain text)
4. Responde 200 inmediatamente
5. `processWebhook(source, payload, headers)` en background (fire-and-forget)
6. Si falla → insert en `webhook_dead_letters`

## Validadores (`_lib/validators.ts`)

| Source | Método |
|--------|--------|
| Telegram | Compara `x-telegram-bot-api-secret-token` header directamente |
| N8N | Compara `x-n8n-webhook-secret` header directamente |
| Dokploy | HMAC-SHA256 del body con el secret |
| Notion | HMAC-SHA256 del body con el secret |

El secret viene de la tabla `webhook_sources` (query por `source`).

## Normalizers (`_lib/normalizers.ts`)

Cada source tiene una función `normalizeX(payload) → NormalizedEvent | null`.

**`NormalizedEvent`** (`_lib/types.ts`):
```typescript
{
  source: string
  event_type: string
  actor: string
  action: string
  description: string
  channel?: string
  severity?: 'success' | 'warning' | 'error'
  business_id?: string       // asignado por processN8NExecution para N8N
  target_user_id?: string    // para insert en notifications
  metadata?: Record<string, unknown>
}
```

**Telegram** (`normalizeTelegram`):
- Soporta `message` y `reply` events
- Resuelve `telegram_id` → `user_id` via `user_profiles` para personal notifications
- Si hay `target_user_id`, se inserta también en `notifications`

**N8N** (`normalizeN8N`):
- Extrae `instance_id`, `workflow_id`, `execution_id`, `status`, `workflow_name`
- `business_id` se asigna en `processN8NExecution()` después del lookup de instancia

## Dead Letters

Cualquier excepción en `processWebhook()` va a `webhook_dead_letters`:
```typescript
{ source, payload, error: error.message, headers }
```

Pendiente: UI admin para ver/resolver dead letters (Sprint 3 Fase 8).

## Agregar un Nuevo Source

1. Añadir fila en `webhook_sources` con `source`, `secret`, `is_active=true`
2. Crear función `normalizeX(payload)` en `normalizers.ts`
3. Si necesita validación HMAC: agregar case en `validators.ts`
4. Si tiene pipeline especial (como N8N): agregar `if (source === 'x')` en `processWebhook()`
