"use client"

import { Zap, AlertTriangle, DollarSign, Cpu } from "lucide-react"
import { MetricCard } from "@/components/dashboard/metric-card"
import { Card, CardContent } from "@/components/ui/card"
import type { DbInstanceStats } from "@/lib/supabase/types"

interface InstanceMetricsProps {
  instance: DbInstanceStats | null
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

export function InstanceMetrics({ instance, isLoading }: InstanceMetricsProps) {
  if (isLoading || !instance) {
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
        value={instance.total_executions.toLocaleString()}
        change={`${instance.success_count} exitosas`}
        changeType="positive"
        icon={Zap}
      />
      <MetricCard
        title="Tasa de Error"
        value={`${instance.error_rate.toFixed(1)}%`}
        change={`${instance.error_count} error${instance.error_count !== 1 ? "es" : ""}`}
        changeType={
          instance.error_rate === 0
            ? "positive"
            : instance.error_rate < 5
              ? "neutral"
              : "negative"
        }
        icon={AlertTriangle}
      />
      <MetricCard
        title="Costo Total"
        value={`$${instance.total_cost.toFixed(4)}`}
        change="últimos 30 días"
        changeType="neutral"
        icon={DollarSign}
      />
      <MetricCard
        title="Tokens Totales"
        value={instance.total_tokens.toLocaleString()}
        change={`${instance.workflow_count} workflow${instance.workflow_count !== 1 ? "s" : ""}`}
        changeType="neutral"
        icon={Cpu}
      />
    </div>
  )
}
