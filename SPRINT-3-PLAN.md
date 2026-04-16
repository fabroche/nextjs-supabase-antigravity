# Sprint 3 — Plan de Implementación: Sección "Automatizaciones" + N8N Analytics

> **Estado**: ✅ COMPLETADO — todas las fases entregadas  
> **Fecha de creación**: 2026-04-11  
> **Fecha de cierre**: 2026-04-17  
> **Dependencia**: Sprint 3 original (v0.7.0) completado ✅  
> **Versión entregada**: v1.0.0

---

## Objetivo

Implementar una sección completa **"Automatizaciones"** en el dashboard para monitorear instancias de N8N, workflows y ejecuciones con:

1. **3 niveles de drill-down**: Todas las instancias → Detalle de instancia → Detalle de workflow
2. **Token y cost tracking** via enrichment con la API de N8N
3. **Métricas de negocio personalizables** (data-driven desde tabla `custom_metrics`)
4. **Precios de modelos LLM** para cálculo automático de costos
5. **Realtime updates** para ejecuciones nuevas

También se absorben items pendientes del Sprint 3 original (filtros activity feed, paginación, settings, dead letter admin, fix Telegram videollamada).

---

## Contexto

El dashboard tiene webhooks funcionando (Telegram, Dokploy, N8N) pero los eventos de N8N se almacenan genéricamente en `activity_feed` sin estructura dedicada. Se necesita:

- Registrar **instancias** N8N por negocio (multi-tenant)
- Auto-crear **workflows** al recibir el primer webhook
- Almacenar **ejecuciones** con datos granulares (tokens, costo, duración, errores)
- **Enriquecer** ejecuciones via API de N8N (obtener modelo, tokens si no vienen en el payload)
- **Calcular costos** desde una tabla de precios por modelo

**Notion descartado por ahora** — foco exclusivo en N8N.

---

## Estado de Implementación

| Fase | Descripción | Estado |
|------|-------------|--------|
| 1 | Schema de Base de Datos (migración 008) | ✅ Completada — ejecutada en prod |
| 2 | Pipeline N8N — normalización + enrichment | ✅ Completada — verificada en prod (v0.8.2) |
| 3 | TypeScript Types + Queries | ✅ Completada — commit `b10d1fd` |
| 4 | Navegación + Layout Compartido | ✅ Completada |
| 5 | Level 1: Vista General de Instancias | ✅ Completada |
| 6 | Level 2: Detalle de Instancia | ✅ Completada |
| 7 | Level 3: Detalle de Workflow | ✅ Completada |
| 8 | Items Pendientes (filtros, paginación, etc.) | ✅ Completada — commit `23a0194` |

### Punto de Arranque para el Agente

**Lo que ya existe y NO hay que tocar:**
- `supabase/migrations/008_automatizaciones_schema.sql` — ejecutada, NO re-ejecutar
- `supabase/migrations/009_activity_feed_replica_identity.sql` — ejecutada, NO re-ejecutar
- `src/app/api/webhooks/[source]/route.ts` — pipeline N8N completo, no modificar
- `src/lib/n8n/enrichment.ts` — cliente API N8N con polling, no modificar
- `src/lib/n8n/cost-calculator.ts` — calculadora de costos, no modificar
- `src/lib/supabase/types.ts` — ya tiene `DbN8NInstance`, `DbN8NWorkflow`, `DbN8NExecution`, `DbModelPricing`, `DbCustomMetric`, `DbInstanceStats`, `DbWorkflowStats`, `DbExecutionTrend`, `AutomationGlobalMetrics`, `ExecutionFilters`
- `src/lib/supabase/queries.ts` — ya tiene `fetchInstanceStats`, `fetchGlobalAutomationMetrics`, `fetchInstanceDetail`, `fetchWorkflowStats`, `fetchWorkflowDetail`, `fetchExecutions`, `fetchCustomMetrics`, `fetchExecutionTrend`

**Estado actual de los archivos a modificar en Fase 4:**
- `src/components/dashboard/sidebar.tsx` — `sidebarNav` tiene solo 1 item (Dashboard). `isActive` usa `pathname === item.href` (necesita fix para rutas anidadas). El icono `LayoutDashboard` ya está importado; hay que agregar `Zap` de lucide-react.
- `src/app/page.tsx` — `"use client"`, tiene `Sidebar` + `Header` + `main` inline. Extraer a `DashboardLayout`.

**Lo que hay que crear desde cero:**
- `src/components/dashboard/dashboard-layout.tsx` — NO existe
- `src/app/automatizaciones/` — directorio NO existe
- `src/components/automatizaciones/` — directorio NO existe
- `src/hooks/use-n8n-executions.ts` — NO existe

---

## Fases de Implementación

### Fase 1 — Schema de Base de Datos ✅ COMPLETADA

**Migración**: `supabase/migrations/008_automatizaciones_schema.sql`

**Tablas nuevas**:

| Tabla | Propósito | Columnas clave |
|-------|-----------|----------------|
| `n8n_instances` | Registro de instancias N8N por negocio | `instance_id` (TEXT UNIQUE), `business_id` (FK), `name`, `environment`, `api_base_url`, `api_key`, `is_active` |
| `n8n_workflows` | Workflows por instancia (auto-creados al recibir webhook) | `instance_id` (FK → n8n_instances), `workflow_id` (TEXT), `name`, `is_active`, `tags`, `last_seen_at`, UNIQUE(instance_id, workflow_id) |
| `n8n_executions` | Datos granulares de ejecución (tabla core de analytics) | `instance_id` (FK), `workflow_id` (FK), `execution_id` (TEXT), `status`, `event_type`, `tokens_prompt`, `tokens_completion`, `model_name`, `cost_usd`, `duration_ms`, `error_message`, `error_node`, `is_enriched`, `metadata` (JSONB), UNIQUE(instance_id, execution_id) |
| `model_pricing` | Precios por modelo LLM para cálculo de costos | `model_name` (TEXT UNIQUE), `provider`, `cost_per_1k_prompt`, `cost_per_1k_completion`, `is_active` |
| `custom_metrics` | Métricas de negocio configurables por workflow/instancia | `workflow_id` (FK nullable), `instance_id` (FK nullable), `name`, `slug`, `metric_type` (count/sum/avg/ratio), `filter_event_type`, `source_field`, `display_format`, `icon` |

**Alteraciones**:
- `activity_feed` += `business_id` (FK nullable → businesses)
- RLS de `activity_feed` actualizada: admin ve todo, negocio ve sus eventos + eventos sin business_id

**Vistas**:
- `n8n_instance_stats` — métricas agregadas por instancia (últimos 30 días)
- `n8n_workflow_stats` — métricas agregadas por workflow (últimos 30 días)

**Función RPC**:
- `get_execution_trend(instance_id, workflow_id, days)` — ejecuciones/errores/costo por día (para gráficos)

**RLS**: Todas las tablas nuevas siguen el patrón existente:
- Admin: `is_admin()` → acceso total
- Negocio: cadena `n8n_executions → n8n_instances → businesses.owner_id = auth.uid()`

**Realtime**: `n8n_executions` añadida a `supabase_realtime`

**Seed data**: `model_pricing` con precios de GPT-4o, GPT-4o-mini, GPT-4.1, GPT-4.1-mini, GPT-4.1-nano, Claude Sonnet 4, Claude Haiku 3.5

---

### Fase 2 — Pipeline de Normalización + Enriquecimiento ✅ COMPLETADA

**Archivos a modificar**:
- `src/app/api/webhooks/_lib/types.ts` — agregar `business_id` a `NormalizedEvent`
- `src/app/api/webhooks/_lib/normalizers.ts` — N8N normalizer busca instancia y deriva business_id
- `src/app/api/webhooks/[source]/route.ts` — nueva función `processN8NExecution()`

**Archivos nuevos**:
- `src/lib/n8n/enrichment.ts` — cliente para API de N8N (`GET /api/v1/executions/{id}`)
- `src/lib/n8n/cost-calculator.ts` — cálculo de costo desde `model_pricing`

**Flujo de `processN8NExecution()`**:
1. Lookup `n8n_instances` por `payload.instance_id` → obtiene `business_id`, `api_base_url`, `api_key`
2. Upsert `n8n_workflows` (auto-crea workflow al primer webhook)
3. Insert `n8n_executions` con datos disponibles (`is_enriched = false`)
4. Set `event.business_id` en el NormalizedEvent para `activity_feed`
5. Si instancia tiene `api_base_url` + `api_key`:
   - Llama API de N8N para obtener `tokens_prompt`, `tokens_completion`, `model_name`
   - Calcula costo con `model_pricing`
   - UPDATE `n8n_executions` con tokens, modelo, costo, `is_enriched = true`

**Duplicados**: Insert con `ON CONFLICT (instance_id, execution_id) DO NOTHING`

---

### Fase 3 — TypeScript Types + Queries ✅ COMPLETADA

**Archivos a modificar**:
- `src/lib/supabase/types.ts` — agregar: `DbN8NInstance`, `DbN8NWorkflow`, `DbN8NExecution`, `DbModelPricing`, `DbCustomMetric`, `DbInstanceStats`, `DbWorkflowStats`
- `src/lib/supabase/queries.ts` — agregar queries para las tablas + custom metrics

**Queries principales**:
- `fetchInstanceStats(businessId?)` — vista Level 1
- `fetchGlobalAutomationMetrics(businessId?)` — cards resumen
- `fetchInstanceDetail(instanceId)` — vista Level 2
- `fetchWorkflowStats(instanceId)` — workflows de una instancia
- `fetchWorkflowDetail(workflowId)` — vista Level 3
- `fetchExecutions(workflowId, filters, page)` — tabla paginada
- `fetchCustomMetrics(scope)` — definiciones de métricas custom
- `fetchExecutionTrend(instanceId?, workflowId?, days?)` — datos para gráfico

---

### Fase 4 — Navegación + Layout Compartido

**Archivos a modificar**:

1. **`src/components/dashboard/sidebar.tsx`**:
   - Agregar `Zap` al import de `lucide-react`
   - Agregar a `sidebarNav`: `{ title: "Automatizaciones", href: "/automatizaciones", icon: Zap }`
   - Cambiar `isActive` en ambos componentes (`Sidebar` y `MobileSidebar`) de:
     ```ts
     const isActive = pathname === item.href
     ```
     a:
     ```ts
     const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
     ```

2. **`src/app/page.tsx`**:
   - Reemplazar el `<div className="flex min-h-screen">` con `<DashboardLayout>` importado desde `@/components/dashboard/dashboard-layout`
   - Eliminar `<Sidebar />` y `<Header />` del JSX (los provee DashboardLayout)
   - Conservar todo el estado y lógica business; solo cambia la estructura de layout

**Archivos nuevos**:

3. **`src/components/dashboard/dashboard-layout.tsx`** (nuevo):
   ```tsx
   // Server component — solo estructura visual, sin estado
   // Renderiza: <Sidebar /> a la izquierda + <Header /> arriba + {children} en main
   // El "use client" NO va aquí — Sidebar y Header ya lo tienen internamente
   // children va dentro de: <main className="flex-1 p-4 md:p-6 lg:p-8">
   ```

**Rutas a crear (estructuras vacías en Fases 5-7)**:
```
src/app/automatizaciones/page.tsx                          → Level 1
src/app/automatizaciones/[instanceId]/page.tsx             → Level 2
src/app/automatizaciones/[instanceId]/[workflowId]/page.tsx → Level 3
```

**Verificación Fase 4**: navegar a `/automatizaciones` desde el sidebar → enlace resalta correctamente; volver a `/` → Dashboard resalta, Automatizaciones no.

---

### Fase 5 — Level 1: Vista General de Instancias

**Ruta**: `/automatizaciones`

**Archivos nuevos**:
- `src/app/automatizaciones/page.tsx`
- `src/components/automatizaciones/global-metrics.tsx` — 4 MetricCards (ejecuciones, error rate, costo, tokens)
- `src/components/automatizaciones/instance-card.tsx` — card clickeable con status indicator
- `src/hooks/use-n8n-executions.ts` — hook Realtime para actualizaciones live

**Estructura visual**:
```
[MetricCard: Ejecuciones] [MetricCard: Tasa Error] [MetricCard: Costo] [MetricCard: Tokens]

[InstanceCard: Salón Prod]  [InstanceCard: Genzai Prod]  [InstanceCard: Salon Staging]
  ● verde                     ● amarillo                    ● gris
  prod                        prod                          staging
  152 ejecuciones             89 ejecuciones                12 ejecuciones
```

---

### Fase 6 — Level 2: Detalle de Instancia

**Ruta**: `/automatizaciones/[instanceId]`

**Archivos nuevos**:
- `src/app/automatizaciones/[instanceId]/page.tsx`
- `src/components/automatizaciones/instance-metrics.tsx`
- `src/components/automatizaciones/workflow-card.tsx`
- `src/components/automatizaciones/execution-trend-chart.tsx` — Recharts AreaChart (success/error por día)
- `src/components/automatizaciones/custom-metrics-row.tsx` — métricas custom data-driven

**Estructura visual**:
```
Breadcrumb: Automatizaciones > Salón Producción

[MetricCard x4: métricas de esta instancia]
[CustomMetric x N: métricas de negocio configuradas]
[AreaChart: tendencia de ejecuciones 30 días]

[WorkflowCard: Agente Salón]    [WorkflowCard: Notificaciones]
  ● verde                         ● verde
  Última ejec: hace 5 min         Última ejec: hace 2h
  45 ejecuciones, 2% error        23 ejecuciones, 0% error
```

---

### Fase 7 — Level 3: Detalle de Workflow

**Ruta**: `/automatizaciones/[instanceId]/[workflowId]`

**Archivos nuevos**:
- `src/app/automatizaciones/[instanceId]/[workflowId]/page.tsx`
- `src/components/automatizaciones/execution-table.tsx` — tabla paginada
- `src/components/automatizaciones/execution-filters.tsx` — filtros (fecha, status, event_type)

**Estructura visual**:
```
Breadcrumb: Automatizaciones > Salón Producción > Agente Salón

[MetricCard x4: métricas del workflow]
[CustomMetric x N: métricas de negocio de este workflow]
[AreaChart: tendencia]

[Filtros: DateRangePicker | Status | EventType]
[Tabla de ejecuciones paginada]
  Fecha | Estado | Evento | Tokens | Costo | Duración | Error
  ...
  [< 1 2 3 ... >]
```

Reutiliza `DateRangePicker` de `src/components/reports/date-range-picker.tsx`.

---

### Fase 8 — Items Pendientes (del Sprint 3 original)

| Item | Archivos | Detalle |
|------|----------|---------|
| **Filtros activity feed** | `activity-feed.tsx`, `use-activity-feed.ts` | Agregar select por source (all/telegram/dokploy/n8n) |
| **Paginación activity feed** | `activity-feed.tsx`, `use-activity-feed.ts` | Botón "Cargar más" con offset |
| **Fix Telegram videollamada** | `normalizers.ts` | Detectar `video_chat_started`, `video_chat_participants_invited` |
| **Settings panel** | `src/app/settings/page.tsx` | Form para vincular telegram_id, notion_person_id. Agregar "Ajustes" al sidebar |
| **Dead letter admin** | `src/app/admin/dead-letters/page.tsx` | Tabla de dead letters con "marcar resuelto" (admin only) |

---

## Archivos Nuevos (Resumen)

```
src/
  app/
    automatizaciones/
      page.tsx                                    ← Level 1
      [instanceId]/
        page.tsx                                  ← Level 2
        [workflowId]/
          page.tsx                                ← Level 3
    settings/
      page.tsx                                    ← Settings panel
    admin/
      dead-letters/
        page.tsx                                  ← Dead letter viewer
  components/
    automatizaciones/
      global-metrics.tsx
      instance-card.tsx
      instance-metrics.tsx
      workflow-card.tsx
      workflow-metrics.tsx
      custom-metrics-row.tsx
      execution-trend-chart.tsx
      execution-table.tsx
      execution-filters.tsx
    dashboard/
      dashboard-layout.tsx                        ← Layout compartido (refactor)
  hooks/
    use-n8n-executions.ts
  lib/
    n8n/
      enrichment.ts                               ← Cliente API N8N
      cost-calculator.ts                          ← Cálculo de costos
supabase/
  migrations/
    008_automatizaciones_schema.sql
```

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/app/api/webhooks/_lib/types.ts` | +`business_id` en NormalizedEvent |
| `src/app/api/webhooks/_lib/normalizers.ts` | Lookup instancia, derivar business_id |
| `src/app/api/webhooks/[source]/route.ts` | +`processN8NExecution()`, +business_id en insert |
| `src/lib/supabase/types.ts` | +7 interfaces nuevas |
| `src/lib/supabase/queries.ts` | +8 funciones de query |
| `src/components/dashboard/sidebar.tsx` | +nav item "Automatizaciones", fix isActive |
| `src/components/dashboard/activity-feed.tsx` | +filtros por source, +paginación |
| `src/hooks/use-activity-feed.ts` | +soporte filtro y offset |
| `src/app/api/webhooks/_lib/normalizers.ts` | Fix Telegram videollamada |
| `src/app/page.tsx` | Refactor para usar DashboardLayout |
| `CLAUDE.md` | Actualizar al completar |
| `README.md` | Actualizar al completar |

---

## Verificación End-to-End

1. **Fase 1**: Ejecutar migración → verificar tablas con `\dt` en SQL Editor
2. **Fase 2**: Registrar instancia en `n8n_instances` → enviar webhook → verificar que `n8n_executions` tiene fila con tokens y costo
3. **Fase 3**: Verificar `npx tsc --noEmit` sin errores
4. **Fase 4**: Navegar a `/automatizaciones` desde sidebar → verificar que resalta correctamente
5. **Fase 5**: Ver cards de instancias con datos reales, verificar Realtime
6. **Fase 6**: Click en instancia → ver detalle con workflows y gráfico de tendencia
7. **Fase 7**: Click en workflow → ver tabla de ejecuciones con filtros y paginación
8. **Fase 8**: Filtrar activity feed por source, paginación, fix videollamada Telegram

---

## Notas de Diseño

- **Costo**: Prioridad: payload `cost_usd` > calculado por enrichment > 0
- **Enrichment**: Non-blocking — se inserta la ejecución primero, se enriquece después. Si falla, la fila queda con `is_enriched = false`
- **Custom metrics**: Data-driven via tabla `custom_metrics`. Inicialmente se configuran via SQL, UI de administración en sprint futuro
- **RLS performance**: Si las queries se vuelven lentas por los JOINs de 3 tablas en RLS, agregar `business_id` denormalizado a `n8n_executions`
- **Componentes reutilizados**: `MetricCard`, `Card`, `Table`, `Badge`, `DateRangePicker`, `Tabs`, Recharts
- **Seguridad**: `error.description` de N8N puede contener API keys — solo usar `error.message` (genérico)
- **N8N sub-nodes**: Los modelos AI dentro de Agent nodes no exponen tokenUsage al flujo principal — usar API enrichment

---

_Creado: 2026-04-11_  
_Sprint: 3 (nuevo)_  
_Version objetivo: 0.8.0_  
_Dependencia: Sprint 3 original (v0.7.0) completado_
