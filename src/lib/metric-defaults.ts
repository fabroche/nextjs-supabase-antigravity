import type { DbMetricDefinition, MetricScope } from '@/lib/supabase/types'

function make(key: string, scope: MetricScope, label: string, format: DbMetricDefinition['format'], icon: string, order: number): DbMetricDefinition {
  return { id: `default-${scope}-${key}`, key, scope, label, description: null, format, icon, display_order: order, is_active: true, business_id: null, created_at: '', updated_at: '' }
}

export const DEFAULT_METRIC_DEFINITIONS: Record<MetricScope, DbMetricDefinition[]> = {
  global: [
    make('executions_total', 'global', 'Ejecuciones',   'number',   'Activity',    0),
    make('error_rate',       'global', 'Tasa de error', 'percent',  'AlertCircle', 1),
    make('total_cost_usd',   'global', 'Costo',         'currency', 'DollarSign',  2),
    make('total_tokens',     'global', 'Tokens',        'tokens',   'Zap',         3),
  ],
  instance: [
    make('executions_total', 'instance', 'Ejecuciones',   'number',   'Activity',    0),
    make('error_rate',       'instance', 'Tasa de error', 'percent',  'AlertCircle', 1),
    make('total_cost_usd',   'instance', 'Costo',         'currency', 'DollarSign',  2),
    make('total_tokens',     'instance', 'Tokens',        'tokens',   'Zap',         3),
  ],
  workflow: [
    make('executions_total', 'workflow', 'Ejecuciones',   'number',   'Activity',    0),
    make('error_rate',       'workflow', 'Tasa de error', 'percent',  'AlertCircle', 1),
    make('total_cost_usd',   'workflow', 'Costo',         'currency', 'DollarSign',  2),
    make('total_tokens',     'workflow', 'Tokens',        'tokens',   'Zap',         3),
  ],
}
