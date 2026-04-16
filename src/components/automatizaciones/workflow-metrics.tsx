"use client"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Zap, AlertTriangle, DollarSign, Cpu } from "lucide-react"
import { MetricCard } from "@/components/dashboard/metric-card"
import { Card, CardContent } from "@/components/ui/card"
import type { DbWorkflowStats, DbWorkflowMetricsByRange } from "@/lib/supabase/types"

interface WorkflowMetricsProps {
  workflow: DbWorkflowStats | null
  isLoading: boolean
  rangeMetrics?: DbWorkflowMetricsByRange | null
  isRangeLoading?: boolean
  dateRange?: { from: Date; to: Date } | null
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="h-4 w-24 bg-muted rounded animate-pulse mb-3" />
        <div className="h-8 w-32 bg-muted rounded animate-pulse mb-2" />
        <div className="h-3 w-40 bg-muted rounded animate-pulse" />
      </CardContent>
    </Card>
  )
}

export function WorkflowMetrics({
  workflow,
  isLoading,
  rangeMetrics,
  isRangeLoading,
  dateRange,
}: WorkflowMetricsProps) {
  const showingRange = !!dateRange

  if (isLoading || (!workflow && !rangeMetrics)) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
    )
  }

  // When a date range is active use rangeMetrics (or show loading);
  // otherwise fall back to the all-time view stats.
  if (showingRange && isRangeLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
    )
  }

  const stats = (showingRange ? rangeMetrics : null) ?? workflow!

  const rangeLabel = dateRange
    ? `${format(dateRange.from, "d MMM", { locale: es })} – ${format(dateRange.to, "d MMM yyyy", { locale: es })}`
    : "últimos 30 días"

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title={showingRange ? "Ejecuciones (rango)" : "Ejecuciones (30d)"}
        value={stats.total_executions.toLocaleString()}
        change={`${stats.success_count} exitosas`}
        changeType="positive"
        icon={Zap}
      />
      <MetricCard
        title="Tasa de Error"
        value={`${stats.error_rate.toFixed(1)}%`}
        change={`${stats.error_count} error${stats.error_count !== 1 ? "es" : ""}`}
        changeType={
          stats.error_rate === 0
            ? "positive"
            : stats.error_rate < 5
              ? "neutral"
              : "negative"
        }
        icon={AlertTriangle}
      />
      <MetricCard
        title="Costo Total"
        value={`$${stats.total_cost.toFixed(4)}`}
        change={rangeLabel}
        changeType="neutral"
        icon={DollarSign}
      />
      <MetricCard
        title="Tokens Totales"
        value={stats.total_tokens.toLocaleString()}
        change={
          stats.avg_duration_ms !== null
            ? `Duración promedio: ${Math.round(stats.avg_duration_ms / 1000)}s`
            : "prompt + completion"
        }
        changeType="neutral"
        icon={Cpu}
      />
    </div>
  )
}
