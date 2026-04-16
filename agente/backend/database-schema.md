# Database Schema

Supabase PostgreSQL — todas las migraciones están en `supabase/migrations/`. Las 001–009 ya están ejecutadas en producción. **Nunca re-ejecutar ni modificar archivos ya ejecutados** — crear nueva migración.

## Tablas

| Tabla | Propósito | Columnas clave |
|-------|-----------|----------------|
| `user_profiles` | Roles, 1:1 con `auth.users` | `id` (FK), `role` ('admin'/'negocio'), `full_name`, `telegram_id`, `notion_person_id` |
| `businesses` | Negocios (1 user = N businesses) | `id`, `owner_id` (FK), `name`, `currency` |
| `transactions` | Transacciones financieras | `id`, `business_id`, `amount`, `status`, `concept`, `category`, `customer_name/email` |
| `business_metrics_snapshot` | Snapshots diarios de métricas no derivables | `business_id`, `active_users`, `active_now`, `snapshot_date` |
| `activity_feed` | Todos los eventos webhook | `source`, `event_type`, `actor`, `action`, `description`, `channel`, `severity`, `business_id` (nullable), `metadata` JSONB |
| `notifications` | Notificaciones personales | `user_id` (FK), `read`, `read_at` |
| `webhook_sources` | Secrets y config por source | `source`, `secret`, `is_active`, `config` JSONB |
| `webhook_dead_letters` | Webhooks fallidos | `source`, `payload`, `error`, `retries`, `resolved` |
| `n8n_instances` | Instancias N8N por negocio | `instance_id` TEXT UNIQUE, `business_id`, `api_base_url`, `api_key`, `environment` |
| `n8n_workflows` | Auto-creados en primer webhook | `instance_id` (FK), `workflow_id` TEXT, `name`, `tags`, `last_seen_at`. UNIQUE(instance_id, workflow_id) |
| `n8n_executions` | Ejecuciones con tokens y costo | `instance_id`, `workflow_id`, `execution_id` TEXT, `status`, `tokens_prompt`, `tokens_completion`, `model_name`, `cost_usd`, `is_enriched`, `metadata` JSONB. UNIQUE(instance_id, execution_id) |
| `model_pricing` | Precios LLM por 1k tokens | `model_name` UNIQUE, `provider`, `cost_per_1k_prompt`, `cost_per_1k_completion` |
| `custom_metrics` | KPIs configurables | `workflow_id`/`instance_id` (nullable FK), `name`, `slug` UNIQUE, `metric_type`, `filter_event_type`, `source_field`, `display_format` |

## Vistas

| Vista | Propósito |
|-------|-----------|
| `business_metrics` | Agrega `transactions` → revenue/sales por negocio (mes actual vs anterior) |
| `n8n_instance_stats` | Métricas agregadas por instancia (últimos 30 días): total_executions, error_rate, total_tokens, total_cost, workflow_count |
| `n8n_workflow_stats` | Métricas agregadas por workflow (últimos 30 días): mismos campos + avg_duration_ms |

## Funciones RPC

| Función | Firma | Propósito |
|---------|-------|-----------|
| `get_user_role()` | `→ text` | Rol del usuario autenticado ('admin'/'negocio') |
| `get_monthly_chart_data` | `(p_business_id, p_months) → table` | Revenue mensual para el gráfico |
| `get_execution_trend` | `(p_instance_id?, p_workflow_id?, p_days?) → table` | Ejecuciones/errores/costo por día |

## Triggers

- `handle_new_user` — crea `user_profiles` con `role='negocio'` al signup
- `update_updated_at` — actualiza `updated_at` en `user_profiles`, `businesses`, `n8n_instances`, `n8n_workflows`

## Patrón RLS

```sql
-- Admin: acceso total via SECURITY DEFINER
USING ((SELECT public.is_admin()))

-- Negocio: cadena de ownership
USING (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = tabla.business_id
      AND businesses.owner_id = (SELECT auth.uid())
  )
)
```

Siempre usar `(SELECT auth.uid())` con subquery — evita evaluación per-row.

## ⚠️ REPLICA IDENTITY FULL

Requerido en tablas con RLS para que Supabase Realtime emita eventos UPDATE (sin esto se descartan silenciosamente). Aplicado en migración 009:

```sql
ALTER TABLE public.activity_feed REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
```

Si se añade una nueva tabla con RLS que necesite emitir UPDATEs via Realtime, aplicar lo mismo.

## Realtime Publication

`activity_feed`, `notifications`, `n8n_executions` están en `supabase_realtime` publication.

## Índices importantes

- `transactions(business_id, status, created_at DESC)` — queries de métricas
- `notifications(user_id, read) WHERE read = false` — unread count
- `n8n_executions(instance_id, created_at DESC, status)` — analytics queries

## Historial de migraciones

| Migración | Descripción |
|-----------|-------------|
| 001 | `user_profiles`, `is_admin()`, `handle_new_user` trigger |
| 002 | `businesses`, `transactions`, `business_metrics_snapshot`, RLS, índices |
| 003 | Vista `business_metrics`, RPCs `get_monthly_chart_data`, `get_user_role` |
| 004 | Seed data: admin, 3 negocios, transacciones, snapshots |
| 005 | `activity_feed`, `notifications`, Realtime publication |
| 006 | `webhook_sources`, `webhook_dead_letters`, `telegram_id`/`notion_person_id` en user_profiles |
| 007 | Columna `severity` en `activity_feed` |
| 008 | N8N analytics: 5 tablas + 2 vistas + RPC + seed model_pricing + `business_id` en activity_feed |
| 009 | `REPLICA IDENTITY FULL` en `activity_feed` + `notifications` |
