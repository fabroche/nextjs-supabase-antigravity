# Database Migrations

## Overview

This directory contains SQL migration files for the Supabase (PostgreSQL) database. Migrations define the complete database schema: tables, views, functions, triggers, RLS policies, and indexes.

**Supabase Instance**: Self-hosted at `https://supabase.genzai.cloud`

---

## Migration Files

| # | File | Description |
|---|------|-------------|
| 1 | `001_foundation.sql` | `update_updated_at()` function, `user_profiles` table, `is_admin()` helper, RLS policies, `handle_new_user` trigger |
| 2 | `002_business_data.sql` | `businesses`, `transactions`, `business_metrics_snapshot` tables with RLS policies and indexes |
| 3 | `003_views_and_functions.sql` | `business_metrics` view, `get_monthly_chart_data` and `get_user_role` RPC functions |
| 4 | `004_seed_data.sql` | Promotes admin, inserts 3 test businesses, transactions (recent + historical), and metric snapshots |
| 5 | `005_notifications.sql` | `activity_feed`, `notifications` tables, RLS policies, Supabase Realtime publication |
| 6 | `006_webhook_infrastructure.sql` | `webhook_sources`, `webhook_dead_letters` tables, seed 4 sources, `telegram_id`/`notion_person_id` columns on `user_profiles` |
| 7 | `007_activity_severity.sql` | Adds `severity` column to `activity_feed` for color-coded UI (success/warning/error/null) |
| 8 | `008_automatizaciones_schema.sql` | N8N analytics: `n8n_instances`, `n8n_workflows`, `n8n_executions`, `model_pricing`, `custom_metrics`, views, RPC, seed pricing. Adds `business_id` to `activity_feed` |
| 9 | `009_activity_feed_replica_identity.sql` | `REPLICA IDENTITY FULL` on `activity_feed` + `notifications` so Supabase Realtime broadcasts UPDATE events under RLS |
| 10 | `010_date_range_filtering.sql` | `get_execution_trend` RPC extended with `p_from`/`p_to` params; new `get_workflow_metrics_by_range` RPC for date-scoped workflow KPIs |
| 11 | `011_n8n_archived.sql` | Adds `archived_at TIMESTAMPTZ` to `n8n_instances` for soft-delete. RLS admin policy already in migration 008 — no new policy. Rollback: `rollback_011_n8n_archived.sql` |
| 12 | `012_metric_registry_and_ui_prefs.sql` | Creates `metric_definitions` table (12 seed rows: 4 keys × 3 scopes) + `ui_preferences JSONB` on `user_profiles` for per-user metric visibility. RLS: users own their prefs; admin can manage definitions. |
| 13 | `013_user_profiles_avatar.sql` | Adds `avatar_url TEXT` to `user_profiles` for Supabase Storage avatar uploads. |
| 14 | `014_custom_metrics_agendador.sql` | 4 RPCs de métricas de dominio por `event_type` (Mensaje_Respondido, Cita_Confirmada, Cancelacion, Consulta_Disponibilidad) + registros en `custom_metrics` para el workflow Agente Agendador. |
| 15 | `015_custom_metrics_is_active.sql` | Añade `is_active BOOLEAN` a `custom_metrics` (toggle de visibilidad). Rollback incluido. |
| 16 | `016_fix_event_count_case_insensitive.sql` | `get_workflow_event_count` con `LOWER()` para matchear `event_type` sin importar capitalización. |
| 17 | `017_workflow_archived.sql` | `archived_at` en `n8n_workflows` (soft-delete) + RPC `reassign_workflow`. Vista `n8n_workflow_stats` excluye archivados. |
| 18 | `018_executions_business_fields.sql` | **Sprint 5 PR1** — `chat_id` + `is_out_of_hours` en `n8n_executions` (+ índice parcial) para métricas del agendador (Clientes_Atendidos, FH). Backfill desde `activity_feed.metadata`. Rollback: `rollback_018_executions_business_fields.sql` |
| 19 | `019_event_type_catalog.sql` | **Sprint 5 PR2** — catálogo gobernado: tablas `event_types` (business/system, is_default) + `event_type_rules` (tool→event_type), RLS admin/dueño, seed del Agente Agendador Gipsy (`cZw0Wjno07VgtmmJ`). Consumido por `GET /api/event-types`. Rollback: `rollback_019_event_type_catalog.sql` |
| 20 | `020_metric_engine.sql` | **Sprint 5 PR3** — motor de métricas configurable: `metric_type` ampliado + `config JSONB` en `custom_metrics`, RPC `compute_metric` (count/count_distinct/weighted_sum/ratio/sum_field) + helper `metric_build_where`. Borra funciones/seeds de la 014, reseed de 7 métricas Gipsy al workflow correcto. Rollback: `rollback_020_metric_engine.sql` |
| 21 | `021_discover_untracked_event_types.sql` | **Sprint 5 PR4** — RPC `discover_untracked_event_types()`: event_type en `n8n_executions` ausentes del catálogo (auto-descubrimiento para el panel admin). Rollback: `rollback_021_discover_untracked_event_types.sql` |

---

## How to Execute Migrations

### Prerequisites

- Access to the Supabase Dashboard SQL Editor
- Users referenced in `004_seed_data.sql` must exist in `auth.users` before running that file

### Step-by-Step

1. Open the Supabase Dashboard at `https://supabase.genzai.cloud`
2. Navigate to **SQL Editor**
3. Copy and paste each migration file **one at a time, in order** (001 -> 002 -> 003 -> 004)
4. Click **Run** and wait for **Success** before proceeding to the next file
5. If a migration fails, **do not skip it** — fix the error before continuing

### Pre-seed Setup (before running 004)

If users were registered **before** migration 001 was executed, they won't have `user_profiles` rows (the auto-create trigger only fires for new signups). Run this before `004_seed_data.sql`:

```sql
INSERT INTO public.user_profiles (id, full_name)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', '')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles);
```

### Verification Queries

After running all 4 migrations, verify with:

```sql
-- Tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_profiles', 'businesses', 'transactions', 'business_metrics_snapshot')
ORDER BY table_name;

-- Functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_admin', 'update_updated_at', 'handle_new_user', 'get_monthly_chart_data', 'get_user_role');

-- RLS enabled on all tables
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('user_profiles', 'businesses', 'transactions', 'business_metrics_snapshot');

-- Indexes
SELECT indexname, tablename FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles', 'businesses', 'transactions', 'business_metrics_snapshot')
ORDER BY tablename, indexname;

-- View works
SELECT * FROM business_metrics LIMIT 1;

-- Seed data loaded
SELECT COUNT(*) FROM public.businesses;         -- Expected: 3
SELECT COUNT(*) FROM public.transactions;       -- Expected: 33
SELECT COUNT(*) FROM public.business_metrics_snapshot;  -- Expected: 6
```

---

## Schema Overview

### Tables

| Table | Purpose |
|-------|---------|
| `user_profiles` | User roles (admin/negocio), linked 1:1 to `auth.users` |
| `businesses` | Business entities. 1 user can own N businesses |
| `transactions` | Financial transactions. Revenue, sales, chart data are all derived from this table |
| `business_metrics_snapshot` | Daily snapshots for metrics not derivable from transactions (active_users, active_now) |

### View

| View | Purpose |
|------|---------|
| `business_metrics` | Aggregates transactions to calculate `total_revenue`, `revenue_change`, `sales`, `sales_change` per business (current month vs previous month). Uses bounded date ranges (`>= month_start AND < next_month_start`) to avoid including future data. |

### Functions

| Function | Type | Purpose |
|----------|------|---------|
| `is_admin()` | SECURITY DEFINER | Checks if current user is admin. Used in all RLS policies |
| `get_user_role()` | SECURITY DEFINER (RPC) | Returns the authenticated user's role ('admin' or 'negocio') |
| `get_monthly_chart_data(business_id, months)` | SECURITY INVOKER (RPC) | Returns monthly revenue grouped by month for chart display |
| `update_updated_at()` | Trigger function | Auto-updates `updated_at` column on row changes |
| `handle_new_user()` | SECURITY DEFINER | Auto-creates `user_profiles` row when a new user signs up |

### RLS Pattern

- **Negocio users**: Can only access their own data (via `owner_id` or `business_id` chain)
- **Admin users**: Can access everything via `is_admin()` helper
- All `auth.uid()` calls are wrapped in `(select auth.uid())` for performance (called once, not per row)
- All `SECURITY DEFINER` functions use `SET search_path = ''` for security

---

## Important Considerations

### Seed Data is for Testing Only

The data in `004_seed_data.sql` (3 businesses, transactions, snapshots) is **test data**. The metrics and business structure will change as the project evolves toward real production data.

### Adding New Migrations

When adding a new migration:

1. Create a new file with the next sequential number: `005_description.sql`
2. Never modify already-executed migration files — create a new migration instead
3. Test the migration locally or on a staging instance before running in production
4. **Update this README.md** with the new migration details

### Admin User

The admin user is configured as `genzai.cloud@gmail.com` in both:
- `004_seed_data.sql` (promoted to role 'admin' in DB)
- `.env.local` → `NEXT_PUBLIC_ADMIN_EMAIL` (used by frontend until DB role integration)

### Order Matters

- `001` must run before `002` (businesses references user_profiles)
- `002` must run before `003` (view and functions reference businesses and transactions)
- `003` must run before `004` is useful (seed data should be queryable via the view)
- Within `001`: the table is created before `is_admin()` because the function references the table

---

## Execution History

| Date | Migration | Status | Notes |
|------|-----------|--------|-------|
| 2026-04-05 | 001_foundation.sql | Executed | Required reorder: table before is_admin() |
| 2026-04-05 | 002_business_data.sql | Executed | |
| 2026-04-05 | 003_views_and_functions.sql | Executed | |
| 2026-04-05 | 004_seed_data.sql | Executed | Required pre-seed INSERT for existing users without profiles |
| 2026-04-05 | Hotfix: business_metrics view | Applied in SQL Editor | Added upper bound `< date_trunc('month', now()) + INTERVAL '1 month'` to all current-month FILTER clauses. Bug: future months' transactions were included in current month totals. Migration file `003` updated to match. |
| 2026-04-08 | 005_notifications.sql | Executed | activity_feed + notifications tables, RLS, Realtime publication verified |
| 2026-04-08 | 006_webhook_infrastructure.sql | Executed | webhook_sources + dead_letters, 4 sources seeded, user_profiles extended |
| 2026-04-09 | 007_activity_severity.sql | Executed | severity column on activity_feed for color-coded events |
| 2026-04-12 | 008_automatizaciones_schema.sql | Executed | N8N analytics schema (5 tables + 2 views + 1 RPC + model pricing seed), activity_feed.business_id |
| 2026-04-13 | 009_activity_feed_replica_identity.sql | Executed | REPLICA IDENTITY FULL on activity_feed + notifications. Required for Realtime to broadcast UPDATE events on RLS-enabled tables. Fixes enrichment UPDATEs not reaching the dashboard |
| 2026-04-15 | 010_date_range_filtering.sql | Executed | get_execution_trend date range params + get_workflow_metrics_by_range RPC |
| 2026-04-17 | 011_n8n_archived.sql | **Pending** | Sprint 3-MAX PR1 — soft-delete for n8n_instances. Run in Supabase Studio SQL Editor. |
| 2026-04-18 | 012_metric_registry_and_ui_prefs.sql | **Pending** | Sprint 3-MAX PR2 — metric_definitions table + ui_preferences on user_profiles. Run in Supabase Studio SQL Editor. |
| 2026-04-18 | 013_user_profiles_avatar.sql | **Pending** | Sprint 3-MAX PR3 — avatar_url on user_profiles. Also requires: create `avatars` storage bucket (public, 2 MB, png/jpg/webp). Run in Supabase Studio SQL Editor. |
| 2026-04-18 | 014_custom_metrics_agendador.sql | **Pending** | 4 RPCs + registros custom_metrics para workflow Agente Agendador. Run in Supabase Studio SQL Editor. |

---

_Last Updated: 2026-04-18_
