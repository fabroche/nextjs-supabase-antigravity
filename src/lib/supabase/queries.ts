import { createClient } from './client'
import type {
  DbBusiness,
  DbBusinessMetrics,
  DbMetricsSnapshot,
  DbTransaction,
  DbChartData,
  DbActivityFeed,
  DbNotification,
  DbDeadLetter,
  DbUserProfile,
  DbN8NInstance,
  DbN8NWorkflow,
  DbN8NExecution,
  DbCustomMetric,
  DbInstanceStats,
  DbWorkflowStats,
  DbExecutionTrend,
  AutomationGlobalMetrics,
  ExecutionFilters,
  DbMetricDefinition,
  MetricScope,
  UiPreferences,
} from './types'

// Get the authenticated user's role ('admin' | 'negocio')
export async function fetchUserRole(): Promise<'admin' | 'negocio'> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_user_role')
  if (error) throw error
  return (data as string as 'admin' | 'negocio') || 'negocio'
}

// Get businesses (RLS filters automatically by role)
export async function fetchBusinesses(): Promise<DbBusiness[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .order('name')
  if (error) throw error
  return data || []
}

// Get derived metrics from the business_metrics view
export async function fetchBusinessMetrics(businessId: string): Promise<DbBusinessMetrics | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('business_metrics')
    .select('*')
    .eq('business_id', businessId)
    .single()
  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
  return data
}

// Get the 2 most recent snapshots (today + yesterday) for active users change calculation
export async function fetchActiveUsersSnapshot(businessId: string): Promise<{
  current: DbMetricsSnapshot | null
  previous: DbMetricsSnapshot | null
}> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('business_metrics_snapshot')
    .select('*')
    .eq('business_id', businessId)
    .order('snapshot_date', { ascending: false })
    .limit(2)
  if (error) throw error
  return {
    current: data?.[0] || null,
    previous: data?.[1] || null,
  }
}

// Get monthly revenue data for the OverviewChart (RPC)
export async function fetchChartData(businessId: string, months = 6): Promise<DbChartData[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_monthly_chart_data', {
    p_business_id: businessId,
    p_months: months,
  })
  if (error) throw error
  return data || []
}

// Get the N most recent transactions for the activity table
export async function fetchRecentTransactions(businessId: string, limit = 5): Promise<DbTransaction[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

// Get transactions filtered by date range for the Reports tab
export async function fetchTransactionsByDateRange(
  businessId: string,
  from: Date,
  to: Date
): Promise<DbTransaction[]> {
  const supabase = createClient()
  const endOfDay = new Date(to)
  endOfDay.setHours(23, 59, 59, 999)
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', from.toISOString())
    .lte('created_at', endOfDay.toISOString())
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// Get recent activity feed events with optional source filter and pagination
export async function fetchActivityFeed(
  limit = 20,
  offset = 0,
  source?: string,
): Promise<DbActivityFeed[]> {
  const supabase = createClient()
  let query = supabase
    .from('activity_feed')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (source) query = query.eq('source', source)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Current user's profile (for settings)
export async function fetchUserProfile(): Promise<DbUserProfile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, role, telegram_id, notion_person_id, ui_preferences, avatar_url, updated_at')
    .eq('id', user.id)
    .single()
  if (error) throw error
  return data
}

export async function updateAvatarUrl(avatarUrl: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('user_profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)
  if (error) throw error
}

// UI preferences only (for metric visibility hook)
export async function fetchUiPreferences(): Promise<UiPreferences> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}
  const { data, error } = await supabase
    .from('user_profiles')
    .select('ui_preferences')
    .eq('id', user.id)
    .single()
  if (error) return {}
  return (data?.ui_preferences as UiPreferences) ?? {}
}

export async function updateUiPreferences(prefs: UiPreferences): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase
    .from('user_profiles')
    .update({ ui_preferences: prefs })
    .eq('id', user.id)
  if (error) throw error
}

// Update current user's profile fields
export async function updateUserProfile(
  updates: Partial<Pick<DbUserProfile, 'full_name' | 'telegram_id' | 'notion_person_id'>>
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', user.id)
  if (error) throw error
}

// Dead letters (admin only — RLS not yet set, relies on app-level guard)
export async function fetchDeadLetters(resolved = false): Promise<DbDeadLetter[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('webhook_dead_letters')
    .select('*')
    .eq('resolved', resolved)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data || []
}

export async function resolveDeadLetter(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('webhook_dead_letters')
    .update({ resolved: true })
    .eq('id', id)
  if (error) throw error
}

// Get notifications for a user
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

// Mark a single notification as read
export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
  if (error) throw error
}

// Mark all notifications as read for a user
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('read', false)
  if (error) throw error
}

// ============================================================
// N8N Automatizaciones — queries
// ============================================================

export const EXECUTIONS_PAGE_SIZE = 20

// Level 1 — all instances with aggregated stats (view: n8n_instance_stats)
// Only non-archived instances are shown
export async function fetchInstanceStats(businessId?: string): Promise<DbInstanceStats[]> {
  const supabase = createClient()
  let query = supabase
    .from('n8n_instance_stats')
    .select('*')
    .order('name')
  if (businessId) query = query.eq('business_id', businessId)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Level 1 — 4 global summary cards, aggregated from n8n_instance_stats
export async function fetchGlobalAutomationMetrics(
  businessId?: string
): Promise<AutomationGlobalMetrics> {
  const supabase = createClient()
  let query = supabase
    .from('n8n_instance_stats')
    .select('total_executions, error_count, total_tokens, total_cost, is_active')
  if (businessId) query = query.eq('business_id', businessId)
  const { data, error } = await query
  if (error) throw error
  const rows = data || []
  const total_executions = rows.reduce((sum, r) => sum + Number(r.total_executions), 0)
  const error_count = rows.reduce((sum, r) => sum + Number(r.error_count), 0)
  const total_tokens = rows.reduce((sum, r) => sum + Number(r.total_tokens), 0)
  const total_cost = rows.reduce((sum, r) => sum + Number(r.total_cost), 0)
  const active_instances = rows.filter((r) => r.is_active).length
  return {
    total_executions,
    error_count,
    error_rate: total_executions > 0
      ? Math.round((error_count / total_executions) * 1000) / 10
      : 0,
    total_tokens,
    total_cost,
    active_instances,
  }
}

// Level 2 — single instance record (table: n8n_instances)
export async function fetchInstanceDetail(instanceId: string): Promise<DbN8NInstance | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('n8n_instances')
    .select('*')
    .eq('id', instanceId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

// Level 2 — workflows of an instance with aggregated stats (view: n8n_workflow_stats)
export async function fetchWorkflowStats(instanceId: string): Promise<DbWorkflowStats[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('n8n_workflow_stats')
    .select('*')
    .eq('instance_id', instanceId)
    .order('name')
  if (error) throw error
  return data || []
}

// Level 3 — single workflow record (table: n8n_workflows)
export async function fetchWorkflowDetail(workflowId: string): Promise<DbN8NWorkflow | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('n8n_workflows')
    .select('*')
    .eq('id', workflowId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

// Level 3 — paginated execution table with optional filters
export async function fetchExecutions(
  workflowId: string,
  filters: ExecutionFilters = {},
  page = 0
): Promise<{ data: DbN8NExecution[]; count: number }> {
  const supabase = createClient()
  const from = page * EXECUTIONS_PAGE_SIZE
  const to = from + EXECUTIONS_PAGE_SIZE - 1

  let query = supabase
    .from('n8n_executions')
    .select('*', { count: 'exact' })
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.event_type) query = query.eq('event_type', filters.event_type)
  if (filters.from) query = query.gte('created_at', filters.from.toISOString())
  if (filters.to) {
    const endOfDay = new Date(filters.to)
    endOfDay.setHours(23, 59, 59, 999)
    query = query.lte('created_at', endOfDay.toISOString())
  }

  const { data, count, error } = await query
  if (error) throw error
  return { data: data || [], count: count || 0 }
}

// Custom metrics definitions for a given scope (instance or workflow)
export async function fetchCustomMetrics(scope: {
  instanceId?: string
  workflowId?: string
} = {}): Promise<DbCustomMetric[]> {
  const supabase = createClient()
  let query = supabase.from('custom_metrics').select('*').order('name')
  if (scope.workflowId) {
    query = query.eq('workflow_id', scope.workflowId)
  } else if (scope.instanceId) {
    query = query.eq('instance_id', scope.instanceId)
  }
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Execution trend data for charts (RPC: get_execution_trend)
// When from/to are provided the series covers that exact range;
// otherwise falls back to the last `days` days.
export async function fetchExecutionTrend(
  instanceId?: string,
  workflowId?: string,
  days = 30,
  from?: Date,
  to?: Date,
): Promise<DbExecutionTrend[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_execution_trend', {
    p_instance_id: instanceId ?? null,
    p_workflow_id: workflowId ?? null,
    p_days: days,
    p_from: from?.toISOString() ?? null,
    p_to: to?.toISOString() ?? null,
  })
  if (error) throw error
  return data || []
}

// ============================================================
// N8N Instances CRUD (admin only)
// ============================================================

export interface CreateN8NInstanceInput {
  business_id: string
  instance_id: string
  name: string
  environment: 'production' | 'staging' | 'development'
  api_base_url?: string
  api_key?: string
}

export interface UpdateN8NInstanceInput {
  id: string
  name?: string
  environment?: 'production' | 'staging' | 'development'
  api_base_url?: string
  api_key?: string
}

export async function createN8NInstance(input: CreateN8NInstanceInput): Promise<DbN8NInstance> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('n8n_instances')
    .insert({
      business_id: input.business_id,
      instance_id: input.instance_id,
      name: input.name,
      environment: input.environment,
      api_base_url: input.api_base_url || null,
      api_key: input.api_key || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateN8NInstance(input: UpdateN8NInstanceInput): Promise<void> {
  const supabase = createClient()
  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.environment !== undefined) updates.environment = input.environment
  if (input.api_base_url !== undefined) updates.api_base_url = input.api_base_url || null
  if (input.api_key !== undefined && input.api_key !== '') updates.api_key = input.api_key
  const { error } = await supabase
    .from('n8n_instances')
    .update(updates)
    .eq('id', input.id)
  if (error) throw error
}

export async function archiveN8NInstance(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('n8n_instances')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// Fetch all non-archived instances for CRUD management (returns full row incl. api_key mask)
export async function fetchN8NInstances(businessId?: string): Promise<DbN8NInstance[]> {
  const supabase = createClient()
  let query = supabase
    .from('n8n_instances')
    .select('*')
    .is('archived_at', null)
    .order('name')
  if (businessId) query = query.eq('business_id', businessId)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ============================================================
// Metric definitions registry (migration 012)
// ============================================================

// Returns metric definitions for a scope, resolving business overrides.
// Row with matching business_id wins over row with business_id IS NULL (preset).
export async function fetchMetricDefinitions(
  scope: MetricScope,
  businessId?: string,
): Promise<DbMetricDefinition[]> {
  const supabase = createClient()
  // Fetch both presets (business_id IS NULL) and business overrides in one query
  let query = supabase
    .from('metric_definitions')
    .select('*')
    .eq('scope', scope)
    .eq('is_active', true)
    .or(businessId ? `business_id.is.null,business_id.eq.${businessId}` : 'business_id.is.null')
    .order('display_order', { ascending: true })
  const { data, error } = await query
  if (error) throw error
  const rows = data || []
  // DISTINCT ON (key): business-specific row wins over global preset
  const seen = new Map<string, DbMetricDefinition>()
  for (const row of rows) {
    const existing = seen.get(row.key)
    if (!existing || (row.business_id !== null && existing.business_id === null)) {
      seen.set(row.key, row)
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.display_order - b.display_order)
}

// Fetch ALL metric definitions for admin management (including inactive)
export async function fetchAllMetricDefinitions(scope?: MetricScope): Promise<DbMetricDefinition[]> {
  const supabase = createClient()
  let query = supabase
    .from('metric_definitions')
    .select('*')
    .is('business_id', null)
    .order('scope')
    .order('display_order')
  if (scope) query = query.eq('scope', scope)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function updateMetricDefinition(
  id: string,
  updates: Partial<Pick<DbMetricDefinition, 'label' | 'is_active' | 'display_order'>>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('metric_definitions')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

export async function reorderMetricDefinitions(
  items: { id: string; display_order: number }[]
): Promise<void> {
  const supabase = createClient()
  await Promise.all(
    items.map(({ id, display_order }) =>
      supabase.from('metric_definitions').update({ display_order }).eq('id', id)
    )
  )
}

export async function fetchCustomMetricsList(): Promise<import('./types').DbCustomMetric[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('custom_metrics')
    .select('*')
    .order('name')
  if (error) throw error
  return data || []
}

// Active custom metrics for a specific workflow (Level 3)
export async function fetchCustomMetricsForWorkflow(
  workflowId: string
): Promise<import('./types').DbCustomMetric[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('custom_metrics')
    .select('*')
    .eq('workflow_id', workflowId)
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data || []
}

// Count executions for a workflow filtered by event_type (RPC: get_workflow_event_count)
export async function fetchWorkflowEventCount(
  workflowId: string,
  eventType: string,
  from?: Date,
  to?: Date,
): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_workflow_event_count', {
    p_workflow_id: workflowId,
    p_event_type:  eventType,
    p_from: from?.toISOString() ?? null,
    p_to:   to?.toISOString()   ?? null,
  })
  if (error) throw error
  return Number(data) || 0
}

// Toggle is_active on a custom metric (admin only)
export async function toggleCustomMetricActive(id: string, isActive: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('custom_metrics')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) throw error
}

// Aggregated KPIs for a workflow within an optional date range
// (RPC: get_workflow_metrics_by_range)
export async function fetchWorkflowMetricsByRange(
  workflowId: string,
  from?: Date,
  to?: Date,
): Promise<import('./types').DbWorkflowMetricsByRange | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_workflow_metrics_by_range', {
    p_workflow_id: workflowId,
    p_from: from?.toISOString() ?? null,
    p_to: to?.toISOString() ?? null,
  })
  if (error) throw error
  return (data as import('./types').DbWorkflowMetricsByRange[] | null)?.[0] ?? null
}

// ============================================================
// Workflow mutations (migration 017)
// ============================================================

export async function updateWorkflowName(id: string, name: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('n8n_workflows')
    .update({ name })
    .eq('id', id)
  if (error) throw error
}

export async function reassignWorkflow(workflowId: string, newInstanceId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('reassign_workflow', {
    p_workflow_id: workflowId,
    p_new_instance_id: newInstanceId,
  })
  if (error) throw error
}

export async function archiveWorkflow(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('n8n_workflows')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function unarchiveWorkflow(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('n8n_workflows')
    .update({ archived_at: null })
    .eq('id', id)
  if (error) throw error
}
