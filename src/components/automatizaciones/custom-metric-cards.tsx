"use client"

import { useState, useEffect } from "react"
import {
  MessageCircle, CalendarCheck, CalendarX, Search,
  Clock, DollarSign, Cpu, Hourglass, BarChart2,
  type LucideIcon,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { MetricCard } from "@/components/dashboard/metric-card"
import { fetchCustomMetricsForWorkflow, fetchWorkflowEventCount } from "@/lib/supabase/queries"
import type { DbCustomMetric } from "@/lib/supabase/types"

const ICON_MAP: Record<string, LucideIcon> = {
  MessageCircle, CalendarCheck, CalendarX, Search,
  Clock, DollarSign, Cpu, Hourglass, BarChart2,
}

function formatValue(value: number, format: string): string {
  if (format === "currency") return `$${value.toFixed(4)}`
  if (format === "percent")  return `${value.toFixed(1)}%`
  if (format === "tokens")   return value.toLocaleString()
  return value.toLocaleString()
}

interface CustomMetricCardItemProps {
  metric: DbCustomMetric
  workflowId: string
  dateRange: { from: Date; to: Date } | null
}

function CustomMetricCardItem({ metric, workflowId, dateRange }: CustomMetricCardItemProps) {
  const [value, setValue] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!metric.filter_event_type) { setIsLoading(false); return }
    setIsLoading(true)
    fetchWorkflowEventCount(
      workflowId,
      metric.filter_event_type,
      dateRange?.from,
      dateRange?.to,
    )
      .then(setValue)
      .catch(() => setValue(0))
      .finally(() => setIsLoading(false))
  }, [workflowId, metric.filter_event_type, dateRange])

  const Icon = (metric.icon ? ICON_MAP[metric.icon] : null) ?? BarChart2

  if (isLoading) return <Skeleton className="h-[104px] w-full rounded-xl" />

  return (
    <MetricCard
      title={metric.name}
      value={formatValue(value ?? 0, metric.display_format)}
      icon={Icon}
      change={dateRange ? "en rango seleccionado" : "últimos 30 días"}
      changeType="neutral"
    />
  )
}

interface CustomMetricCardsProps {
  workflowId: string
  dateRange: { from: Date; to: Date } | null
}

export function CustomMetricCards({ workflowId, dateRange }: CustomMetricCardsProps) {
  const [metrics, setMetrics] = useState<DbCustomMetric[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchCustomMetricsForWorkflow(workflowId)
      .then(setMetrics)
      .catch(() => setMetrics([]))
      .finally(() => setIsLoading(false))
  }, [workflowId])

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)}
      </div>
    )
  }

  if (metrics.length === 0) return null

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Métricas de negocio</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <CustomMetricCardItem
            key={m.id}
            metric={m}
            workflowId={workflowId}
            dateRange={dateRange}
          />
        ))}
      </div>
    </div>
  )
}
