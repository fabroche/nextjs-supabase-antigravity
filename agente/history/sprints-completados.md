# Historia de Sprints Completados

## Sprint 1 — v0.4.0 (Completado)

- Layout: sidebar collapsible (256px/64px), header, mobile sheet
- Auth: OTP email, protected routes, middleware, user menu con logout
- Roles: admin/negocio via `NEXT_PUBLIC_ADMIN_EMAIL` (luego migrado a DB role)
- Business selector en header (solo admin)
- Métricas: 4 MetricCards con datos reales de Supabase
- v0 cleanup: notificaciones ocultas, búsqueda oculta, tabs reducidas a "Resumen"

## Sprint 2 — v0.6.0 (Completado)

- **Tab Reportes**: DateRangePicker (react-day-picker, español, presets), ReportTable con summary cards, ExportButton CSV via PapaParse
- **Recharts**: OverviewChart reescrito con BarChart responsive, tooltip theme-aware, currency en eje Y
- **DB Schema**: migraciones 001-004 ejecutadas, vista `business_metrics`, RPCs `get_monthly_chart_data` / `get_user_role`

## Sprint 3 Original — v0.7.0 (Completado)

- **Webhook endpoint**: `POST /api/webhooks/[source]` — validación HMAC, fire-and-forget, dead letters
- **Telegram normalizer**: message.new, message.reply, resolución telegram_id → user_id
- **Realtime hooks**: `useActivityFeed` (INSERT), `useNotifications` (INSERT filtrado por user)
- **NotificationBell**: badge unread, dropdown, mark as read
- **ActivityFeed**: feed en vivo, indicador de conexión (Wifi icon)
- **Migraciones**: 005 (activity_feed, notifications, Realtime), 006 (webhook_sources, dead_letters, telegram_id en user_profiles)

## Sprint 3 "Automatizaciones" — v0.8.x (En Progreso)

### Fase 1 — Schema (Completada, migración 008)
- 5 tablas nuevas: `n8n_instances`, `n8n_workflows`, `n8n_executions`, `model_pricing`, `custom_metrics`
- 2 vistas: `n8n_instance_stats`, `n8n_workflow_stats`
- RPC: `get_execution_trend`
- `business_id` añadido a `activity_feed`
- Seed: model_pricing para GPT-4o, GPT-4.1, GPT-4.1-mini, GPT-4.1-nano, Claude Sonnet 4, Claude Haiku 3.5

### Fase 2 — Pipeline N8N (Completada, v0.8.2)
- `processN8NExecution()`: lookup instancia → upsert workflow → insert execution → fire enrichment
- `enrichExecution()`: polling N8N API hasta `finished=true` (4s × 5 reintentos)
- `clearActivityFeedPending()`: UPDATE activity_feed con cost suffix + `enrichment_pending=false`
- `useActivityFeed` extendido con listener UPDATE para merge in-place
- Skeleton UI "Calculando costo…" con escape timer 15s
- Migración 009: `REPLICA IDENTITY FULL` en activity_feed + notifications

### Fase 3 — Types + Queries (Completada, commit b10d1fd)
- 10 interfaces en `types.ts`: DbN8NInstance, DbN8NWorkflow, DbN8NExecution, DbModelPricing, DbCustomMetric, DbInstanceStats, DbWorkflowStats, DbExecutionTrend, AutomationGlobalMetrics, ExecutionFilters
- 8 query functions en `queries.ts`: fetchInstanceStats, fetchGlobalAutomationMetrics, fetchInstanceDetail, fetchWorkflowStats, fetchWorkflowDetail, fetchExecutions (paginada), fetchCustomMetrics, fetchExecutionTrend

### Fases 4-7 — UI Automatizaciones (Pendientes)
Ver `SPRINT-3-PLAN.md` para detalle completo.
