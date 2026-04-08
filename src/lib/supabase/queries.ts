import { createClient } from './client'
import type {
  DbBusiness,
  DbBusinessMetrics,
  DbMetricsSnapshot,
  DbTransaction,
  DbChartData,
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
