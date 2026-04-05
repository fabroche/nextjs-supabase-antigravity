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
