# Infraestructura: Dokploy + Supabase Self-Hosted

## Setup

- **VPS**: Hostinger con Dokploy gestionando el stack de Supabase
- **URL Supabase**: `https://supabase.genzai.cloud`
- **Kong config**: `/etc/dokploy/compose/supabase-supabase-zovmga/files/volumes/api/kong.yml`
- **Stack prefix**: `supabase-supabase-zovmga-` (Dokploy lo genera y lo antepone a todos los contenedores)

---

## Gotcha 1: Upstream hostnames en Kong

Dokploy renombra contenedores con su prefix, rompiendo los upstream hostnames hardcodeados en `kong.yml`.

**Fix aplicado**: cambiar `realtime-dev.supabase-realtime` → `realtime` (Docker Compose network alias, estable entre reinicios)

---

## Gotcha 2: Host header para Realtime v2 (multi-tenant)

Supabase Realtime v2 usa el header `Host` como clave de lookup del tenant en `_realtime.tenants`. El tenant en DB se llama `realtime-dev`, pero Kong enviaba `Host: realtime` → Realtime no encontraba el tenant → WebSocket caía.

**Fix aplicado** en `kong.yml` para ambos servicios Realtime (`realtime-v1-ws` y `realtime-v1-rest`):

```yaml
plugins:
  - name: request-transformer
    config:
      replace:
        headers:
          - host:realtime-dev
```

---

## Reglas operacionales

| Acción | Correcto | Incorrecto |
|--------|----------|------------|
| Aplicar cambios a kong.yml | `docker restart <kong-container>` | `kong reload` |
| Por qué | El entrypoint corre `envsubst` en `temp.yml` → `kong.yml` al boot | `reload` no re-procesa el template |

- `SEED_SELF_HOST=true` en el contenedor Realtime **sobrescribe** `_realtime.tenants.jwt_secret` en cada restart — no intentar arreglar el tenant directamente en DB
- Todos los servicios comparten el mismo JWT secret

---

## Variables de entorno requeridas

```bash
NEXT_PUBLIC_SUPABASE_URL=https://supabase.genzai.cloud
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SERVICE_ROLE_KEY=...           # Solo backend — nunca exponer al cliente
NEXT_PUBLIC_ADMIN_EMAIL=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...    # También en webhook_sources tabla
```
