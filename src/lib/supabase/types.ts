// ============================================================
// TypeScript interfaces for Supabase database tables and views
// ============================================================

// Table: businesses
export interface DbBusiness {
  id: string
  owner_id: string
  name: string
  currency: string
  created_at: string
  updated_at: string
}

// View: business_metrics
export interface DbBusinessMetrics {
  business_id: string
  business_name: string
  total_revenue: number
  prev_revenue: number
  revenue_change: number
  sales: number
  prev_sales: number
  sales_change: number
}

// Table: business_metrics_snapshot
export interface DbMetricsSnapshot {
  id: string
  business_id: string
  active_users: number
  active_now: number
  snapshot_date: string
  created_at: string
}

// Table: transactions
export interface DbTransaction {
  id: string
  business_id: string
  customer_name: string
  customer_email: string
  amount: number
  status: 'success' | 'pending' | 'failed'
  concept: string | null
  category: string | null
  created_at: string
}

// RPC: get_monthly_chart_data result
export interface DbChartData {
  month: string
  value: number
}

// Table: activity_feed
export interface DbActivityFeed {
  id: string
  source: string
  event_type: string
  actor: string
  action: string
  description: string
  channel: string | null
  severity: 'success' | 'warning' | 'error' | null
  business_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// Table: webhook_dead_letters
export interface DbDeadLetter {
  id: string
  source: string
  payload: Record<string, unknown>
  error: string | null
  headers: Record<string, unknown> | null
  retries: number
  resolved: boolean
  created_at: string
}

// Table: user_profiles (subset of columns relevant to settings)
export interface DbUserProfile {
  id: string
  full_name: string | null
  role: 'admin' | 'negocio'
  telegram_id: string | null
  notion_person_id: string | null
  updated_at: string
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

// ============================================================
// N8N Automatizaciones — tables, views, and RPC result types
// ============================================================

// Table: n8n_instances
export interface DbN8NInstance {
  id: string
  business_id: string
  instance_id: string
  name: string
  environment: 'production' | 'staging' | 'development'
  api_base_url: string | null
  api_key: string | null
  is_active: boolean
  archived_at: string | null
  created_at: string
  updated_at: string
}

// Table: n8n_workflows
export interface DbN8NWorkflow {
  id: string
  instance_id: string
  workflow_id: string
  name: string
  is_active: boolean
  tags: string[]
  last_seen_at: string
  created_at: string
  updated_at: string
}

// Table: n8n_executions
export interface DbN8NExecution {
  id: string
  instance_id: string
  workflow_id: string
  execution_id: string
  status: 'success' | 'error' | 'warning' | 'running'
  event_type: string | null
  tokens_prompt: number
  tokens_completion: number
  model_name: string | null
  cost_usd: number
  duration_ms: number | null
  error_message: string | null
  error_node: string | null
  is_enriched: boolean
  metadata: Record<string, unknown>
  started_at: string
  created_at: string
}

// Table: model_pricing
export interface DbModelPricing {
  id: string
  model_name: string
  provider: string
  cost_per_1k_prompt: number
  cost_per_1k_completion: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Table: custom_metrics
export interface DbCustomMetric {
  id: string
  workflow_id: string | null
  instance_id: string | null
  name: string
  slug: string
  metric_type: 'count' | 'sum' | 'avg' | 'ratio'
  filter_event_type: string | null
  source_field: string | null
  display_format: string
  icon: string | null
  created_at: string
  updated_at: string
}

// View: n8n_instance_stats (aggregated per instance, last 30 days)
export interface DbInstanceStats {
  id: string
  instance_id: string
  name: string
  environment: 'production' | 'staging' | 'development'
  business_id: string
  is_active: boolean
  total_executions: number
  success_count: number
  error_count: number
  error_rate: number
  total_tokens: number
  total_cost: number
  workflow_count: number
  last_execution_at: string | null
}

// View: n8n_workflow_stats (aggregated per workflow, last 30 days)
export interface DbWorkflowStats {
  id: string
  instance_id: string
  workflow_id: string
  name: string
  is_active: boolean
  tags: string[]
  total_executions: number
  success_count: number
  error_count: number
  error_rate: number
  total_tokens: number
  total_cost: number
  avg_duration_ms: number | null
  last_execution_at: string | null
}

// RPC: get_execution_trend result row
export interface DbExecutionTrend {
  day: string
  total_executions: number
  success_count: number
  error_count: number
  total_tokens: number
  total_cost: number
}

// RPC: get_workflow_metrics_by_range result row
export interface DbWorkflowMetricsByRange {
  total_executions: number
  success_count: number
  error_count: number
  error_rate: number
  total_tokens: number
  total_cost: number
  avg_duration_ms: number | null
}

// Aggregated global metrics built from n8n_instance_stats
export interface AutomationGlobalMetrics {
  total_executions: number
  error_count: number
  error_rate: number
  total_tokens: number
  total_cost: number
  active_instances: number
}

// Filters for the execution table (Fase 7)
export interface ExecutionFilters {
  status?: 'success' | 'error' | 'warning' | 'running'
  event_type?: string
  from?: Date
  to?: Date
}

// ============================================================
// Composite type used by the frontend
// Maintains the same shape as the old mock Business interface
// so MetricCard, OverviewChart, and Header work without changes
export interface Business {
  id: string
  name: string
  currency: string
  ownerId: string
  metrics: {
    totalRevenue: number
    revenueChange: number
    activeUsers: number
    usersChange: number
    sales: number
    salesChange: number
    activeNow: number
    activeNowChange: number
  }
  chartData: Array<{ month: string; value: number }>
  recentActivity: Array<{
    id: string
    user: string
    email: string
    amount: string
    status: 'success' | 'pending' | 'failed'
  }>
}
