"use client"

import { Zap, AlertTriangle, DollarSign, Cpu } from "lucide-react"
import { MetricCard } from "@/components/dashboard/metric-card"
import { Card, CardContent } from "@/components/ui/card"
import type { AutomationGlobalMetrics } from "@/lib/supabase/types"

interface GlobalMetricsProps {
  metrics: AutomationGlobalMetrics | null
  isLoading: boolean
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

export function GlobalMetrics({ metrics, isLoading }: GlobalMetricsProps) {
  if (isLoading || !metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Ejecuciones (30d)"
        value={metrics.total_executions.toLocaleString()}
        change={`${metrics.active_instances} instancia${metrics.active_instances !== 1 ? 's' : ''} activa${metrics.active_instances !== 1 ? 's' : ''}`}
        changeType="neutral"
        icon={Zap}
      />
      <MetricCard
        title="Tasa de Error"
        value={`${metrics.error_rate.toFixed(1)}%`}
        change={`${metrics.error_count} error${metrics.error_count !== 1 ? 'es' : ''} en 30 días`}
        changeType={
          metrics.error_rate === 0
            ? "positive"
            : metrics.error_rate < 5
              ? "neutral"
              : "negative"
        }
        icon={AlertTriangle}
      />
      <MetricCard
        title="Costo Total"
        value={`$${metrics.total_cost.toFixed(4)}`}
        change="últimos 30 días"
        changeType="neutral"
        icon={DollarSign}
      />
      <MetricCard
        title="Tokens Totales"
        value={metrics.total_tokens.toLocaleString()}
        change="prompt + completion"
        changeType="neutral"
        icon={Cpu}
      />
    </div>
  )
}
