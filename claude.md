# Project Context & Memory

> **🚨 SIEMPRE ACTUALIZAR DOCS DESPUÉS DE CADA CAMBIO**
> Actualizar: `README.md`, `claude.md`, `supabase/migrations/README.md` (si hay migración). No saltarse este paso.

> **🛠️ CONSULTAR SKILLS ANTES DE ESCRIBIR CÓDIGO**
> `.agents/skills/` — usar `supabase-postgres-best-practices`, `vercel-react-best-practices`, `web-design-guidelines`, `ui-ux-pro-max` según corresponda.

---

## Project Overview

**Stack**: Next.js 16, TypeScript, Supabase Auth, shadcn/ui, Tailwind CSS v4  
**Version**: v0.9.0 — Sección Automatizaciones completa (3 niveles de drill-down)  
**Next**: Sprint 3 Fase 8 — filtros activity feed, paginación, settings panel, dead letters  
**Sprint activo**: `SPRINT-3-PLAN.md` (Fase 8 pendiente)

---

## Architecture & Key Patterns

**Tech**: Next.js 16.1 App Router · React 19 · TypeScript 5 · Tailwind v4 (CSS-first) · shadcn/ui (new-york style) · Supabase SSR

**Clients Supabase**:
- `lib/supabase/client.ts` → `createBrowserClient` (client components)
- `lib/supabase/server.ts` → `createServerClient` (server components/actions)
- `lib/supabase/admin.ts` → service role, solo backend (webhooks, enrichment)

**Auth**: OTP email via Supabase. Middleware en `middleware.ts` + `lib/supabase/middleware.ts` protege todas las rutas excepto `/login`, `/verify-email`, `/auth/callback`.

**Roles**: `admin` / `negocio` — en DB via `user_profiles.role`. RLS filtra automáticamente. Admin ve todos los negocios; negocio ve solo el suyo. `get_user_role()` RPC para el frontend.

**Business Context** (`contexts/business-context.tsx`): provee `selectedBusiness`, `businesses`, `isAdmin`, `isLoading`, `isLoadingData`. Wraps toda la app en `layout.tsx`.

---

## Project Structure (partes no-obvias)

```
src/
  app/
    api/webhooks/
      [source]/route.ts      # Entry point — validateWebhook → normalizeEvent → processN8NExecution → insert
      _lib/
        types.ts             # NormalizedEvent (source, event_type, actor, action, description, business_id?)
        validators.ts        # HMAC para Dokploy/Notion; comparación directa para Telegram/N8N
        normalizers.ts       # normalizeN8N(), normalizeTelegram() — construyen NormalizedEvent
  lib/
    n8n/
      enrichment.ts          # fetchN8NExecutionDetail() — polling hasta finished=true
      cost-calculator.ts     # calculateCost() — cache in-memory 5min desde model_pricing
    supabase/
      types.ts               # DbBusiness, DbActivityFeed, DbN8NInstance..DbExecutionTrend, ExecutionFilters
      queries.ts             # fetchBusinessMetrics, fetchInstanceStats, fetchExecutions, fetchExecutionTrend...
  hooks/
    use-activity-feed.ts     # Realtime INSERT+UPDATE → merge in-place por id
    use-notifications.ts     # Realtime INSERT filtrado por user_id
  components/
    dashboard/
      activity-feed.tsx      # Skeleton "Calculando costo…" mientras enrichment_pending=true
      sidebar.tsx            # Collapsible 256px/64px; sidebarNav array; isActive startsWith
      dashboard-layout.tsx   # Layout compartido (Sidebar + Header + main) — usar en todas las páginas
    automatizaciones/
      global-metrics.tsx     # 4 MetricCards globales (ejecuciones, error rate, costo, tokens)
      instance-card.tsx      # Card clickeable → Level 2, status dot, stats
      instance-metrics.tsx   # 4 MetricCards por instancia (DbInstanceStats)
      workflow-card.tsx      # Card clickeable → Level 3, tags, stats
      workflow-metrics.tsx   # 4 MetricCards por workflow (DbWorkflowStats)
      execution-trend-chart.tsx # Recharts AreaChart (success vs error por día, 30d)
      execution-filters.tsx  # DateRangePicker + Select status → ExecutionFilters
      execution-table.tsx    # Tabla paginada 20/página con skeleton loading
  app/
    automatizaciones/
      page.tsx               # Level 1 — GlobalMetrics + grid de InstanceCards
      [instanceId]/
        page.tsx             # Level 2 — breadcrumb + InstanceMetrics + TrendChart + WorkflowCards
        [workflowId]/
          page.tsx           # Level 3 — breadcrumb + WorkflowMetrics + TrendChart + filters + table
  hooks/
    use-n8n-executions.ts    # Realtime INSERT en n8n_executions → signal para refresh silencioso
```

---

## Infraestructura Dokploy

**Supabase**: self-hosted en `https://supabase.genzai.cloud` (Hostinger VPS + Dokploy)

**Gotcha Kong resuelto (2026-04-09)**: Dokploy renombra contenedores con prefix `supabase-supabase-zovmga-`, rompiendo los upstream de Kong.
- Upstream hostname: `realtime-dev.supabase-realtime` → `realtime`
- Host header Realtime v2 (multi-tenant): agregar plugin `request-transformer` en `kong.yml` para ambos servicios Realtime (ws + rest):
  ```yaml
  plugins:
    - name: request-transformer
      config:
        replace:
          headers:
            - host:realtime-dev
  ```
- Kong: usar `docker restart`, NOT `kong reload` (entrypoint corre `envsubst` en boot)
- `SEED_SELF_HOST=true` en el contenedor Realtime sobrescribe `_realtime.tenants.jwt_secret` en cada restart

---

## Database Schema

**Migrations ejecutadas**: 001–009 en producción. NUNCA re-ejecutar.

| Tabla | Propósito |
|-------|-----------|
| `user_profiles` | Roles (`admin`/`negocio`), linked 1:1 a `auth.users` |
| `businesses` | Negocios (1 user = N businesses) |
| `transactions` | Transacciones financieras — métricas derivadas de aquí |
| `business_metrics_snapshot` | Snapshots diarios (active_users, active_now) |
| `activity_feed` | Todos los eventos webhook. `business_id` nullable. `severity`, `metadata` JSONB |
| `notifications` | Notificaciones personales por user |
| `webhook_sources` | Config + secrets por source |
| `webhook_dead_letters` | Failed webhooks queue |
| `n8n_instances` | Instancias N8N por negocio. `instance_id` TEXT UNIQUE, `api_base_url`, `api_key` |
| `n8n_workflows` | Auto-creados al primer webhook. UNIQUE(instance_id, workflow_id) |
| `n8n_executions` | Core analytics. UNIQUE(instance_id, execution_id). `tokens_prompt`, `tokens_completion`, `model_name`, `cost_usd`, `is_enriched` |
| `model_pricing` | Precios LLM por 1k tokens. Seed: gpt-4o, gpt-4.1, gpt-4.1-mini, claude-sonnet-4... |
| `custom_metrics` | KPIs configurables por workflow/instancia |

**Vistas**: `business_metrics`, `n8n_instance_stats`, `n8n_workflow_stats`  
**RPCs**: `get_user_role()`, `get_monthly_chart_data(business_id, months)`, `get_execution_trend(instance_id?, workflow_id?, days?)`

**RLS pattern**: admin via `is_admin()` (SECURITY DEFINER). Negocio via cadena `owner_id = auth.uid()` o join a `businesses`.  
**⚠️ REPLICA IDENTITY FULL**: requerido en tablas RLS para que Realtime emita UPDATE events. Aplicado en migración 009 a `activity_feed` + `notifications`. Sin esto, los UPDATEs se descartan silenciosamente.

---

## N8N Pipeline

### Flujo

```
POST /api/webhooks/n8n
  → validateWebhook (x-n8n-webhook-secret)
  → normalizeN8N() → NormalizedEvent
  → processN8NExecution()
      ├─ lookup n8n_instances por instance_id → business_id, api_base_url, api_key
      ├─ upsert n8n_workflows
      ├─ insert n8n_executions (ON CONFLICT DO NOTHING)
      ├─ event.business_id = instance.business_id
      └─ si api_key && status=success:
            event.metadata.enrichment_pending = true
            enrichExecution() [fire-and-forget]
  → insert activity_feed (con enrichment_pending=true si aplica)
  → Realtime INSERT → dashboard muestra skeleton "Calculando costo…"

enrichExecution() [background]:
  → poll N8N API GET /api/v1/executions/{id}?includeData=true
  → ⚠️ N8N dispara webhook mid-execution (antes que AI nodes terminen)
  → polling cada 4s hasta data.finished=true (máx 5 reintentos, ~60s)
  → extractTokenUsage() → runData[node][0].data.ai_languageModel[0][0].json.tokenUsage
  → calculateCost() via model_pricing
  → UPDATE n8n_executions (tokens, cost, is_enriched=true)
  → [finally] clearActivityFeedPending() → UPDATE activity_feed (cost suffix + enrichment_pending=false)
  → Realtime UPDATE → dashboard merge in-place → skeleton desaparece
```

### Extracción de tokens (estructura real N8N)

```
data.data.resultData.runData["Modelo OpenAI1"][0]
  .data.ai_languageModel[0][0].json.tokenUsage
  = { completionTokens, promptTokens, totalTokens }

inputOverride.ai_languageModel[0][0].json.options.model = "gpt-4.1-mini"
```
**2 niveles de array** (`[0][0]`), no 3. Loop extra rompe la extracción.

### Escape timer frontend

`useEnrichmentEscape()` en `activity-feed.tsx`: 15s timeout por evento. Si el UPDATE de Realtime nunca llega, el skeleton desaparece solo.

### Setup instancia N8N (una sola vez)

```sql
INSERT INTO n8n_instances (business_id, instance_id, name, environment, api_base_url, api_key)
VALUES ('UUID-BUSINESS', 'genzai-prod', 'Genzai Producción', 'production',
        'https://n8n.genzai.cloud', 'API-KEY-N8N');
```

### 🔮 Cambio futuro: tokens en payload

Colaborador N8N trabajando en Code node que inyecta `tokens_prompt`/`tokens_completion` directo en el webhook payload. Cuando llegue:
- `normalizeN8N()` ya soporta esos campos — sin cambio
- `processN8NExecution()`: chequear `if (tokensPrompt > 0)` → skip enrichment
- Legacy workflows siguen por path actual (fallback automático)
- Beneficio a escala (500+ msg/min): elimina 1 HTTP call + 2 SELECT + 2 UPDATE por mensaje

---

## Estado Actual

- ✅ Migrations 001–009 ejecutadas en producción
- ✅ Realtime WebSocket funcionando (2026-04-09)
- ✅ N8N pipeline verificado con `gpt-4.1-mini` (2026-04-15)
- ✅ Sprint 3 Fases 1-7 completadas: schema + pipeline + types/queries + UI completa
- ⏳ Sprint 3 Fase 8: filtros activity feed, paginación, settings panel, dead letters

---

## Convenciones de Código

- Componentes: PascalCase | Utilities: camelCase | Constantes: UPPER_SNAKE_CASE
- Client components: `"use client"` solo cuando necesario (hooks, eventos)
- Clases condicionales: `cn()` de `@/lib/utils`
- shadcn: `npx shadcn@latest add [component]`
- Tailwind v4: warnings de `@theme`/`@apply` son esperados, ignorar

---

_Last Updated: 2026-04-16 | Version: 0.9.0_
