import { createClient } from './client'
import type {
  DbBusiness,
  DbBusinessMetrics,
  DbMetricsSnapshot,
  DbTransaction,
  DbChartData,
  DbActivityFeed,
  DbNotification,
  DbN8NInstance,
  DbN8NWorkflow,
  DbN8NExecution,
  DbCustomMetric,
  DbInstanceStats,
  DbWorkflowStats,
  DbExecutionTrend,
  AutomationGlobalMetrics,
  ExecutionFilters,
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

// Get recent activity feed events
export async function fetchActivityFeed(limit = 50): Promise<DbActivityFeed[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('activity_feed')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
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
export async function fetchInstanceStats(businessId?: string): Promise<DbInstanceStats[]> {
  const supabase = createClient()
  let query = supabase.from('n8n_instance_stats').select('*').order('name')
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
export async function fetchExecutionTrend(
  instanceId?: string,
  workflowId?: string,
  days = 30
): Promise<DbExecutionTrend[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_execution_trend', {
    p_instance_id: instanceId ?? null,
    p_workflow_id: workflowId ?? null,
    p_days: days,
  })
  if (error) throw error
  return data || []
}
