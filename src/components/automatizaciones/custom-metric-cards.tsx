"use client"

import { useState, useEffect } from "react"
import {
  MessageCircle, CalendarCheck, CalendarX, Search,
  Clock, DollarSign, Cpu, Hourglass, BarChart2, Eye,
  type LucideIcon,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { MetricCard } from "@/components/dashboard/metric-card"
import { MetricVisibilitySheet } from "@/components/dashboard/metric-visibility-sheet"
import { useUiPreferences } from "@/hooks/use-ui-preferences"
import { fetchCustomMetricsForWorkflow, fetchComputedMetric } from "@/lib/supabase/queries"
import type { DbCustomMetric, DbMetricDefinition } from "@/lib/supabase/types"

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

function toDefinition(m: DbCustomMetric): DbMetricDefinition {
  return {
    id: m.id,
    key: m.id,
    scope: "workflow",
    label: m.name,
    description: null,
    format: (m.display_format as DbMetricDefinition["format"]) ?? "number",
    icon: m.icon ?? null,
    display_order: 0,
    is_active: m.is_active,
    business_id: null,
    created_at: "",
    updated_at: "",
  }
}

interface CustomMetricCardItemProps {
  metric: DbCustomMetric
  workflowId: string
  dateRange: { from: Date; to: Date } | null
  scopeKey: string
  onHide: () => void
}

function CustomMetricCardItem({ metric, dateRange, onHide }: CustomMetricCardItemProps) {
  const [value, setValue] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    fetchComputedMetric(metric.id, dateRange?.from, dateRange?.to)
      .then(setValue)
      .catch(() => setValue(0))
      .finally(() => setIsLoading(false))
  }, [metric.id, dateRange])

  const Icon = (metric.icon ? ICON_MAP[metric.icon] : null) ?? BarChart2

  if (isLoading) return <Skeleton className="h-[104px] w-full rounded-xl" />

  return (
    <div className="relative group">
      <MetricCard
        title={metric.name}
        value={formatValue(value ?? 0, metric.display_format)}
        icon={Icon}
        change={dateRange ? "en rango seleccionado" : "últimos 30 días"}
        changeType="neutral"
      />
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onHide}
        title="Ocultar métrica"
      >
        <Eye className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

interface CustomMetricCardsProps {
  workflowId: string
  dateRange: { from: Date; to: Date } | null
}

export function CustomMetricCards({ workflowId, dateRange }: CustomMetricCardsProps) {
  const [metrics, setMetrics] = useState<DbCustomMetric[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { isHidden, getHiddenKeys, toggleMetric, showAll } = useUiPreferences()

  const scopeKey = `custom:workflow:${workflowId}`

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

  const definitions: DbMetricDefinition[] = metrics.map(toDefinition)
  const hiddenKeys = getHiddenKeys(scopeKey)
  const visible = metrics.filter((m) => !isHidden(scopeKey, m.id))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Métricas de negocio</h2>
        <MetricVisibilitySheet
          definitions={definitions}
          scopeKey={scopeKey}
          hiddenKeys={hiddenKeys}
          onToggle={toggleMetric}
          onShowAll={showAll}
        />
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          Todas las métricas están ocultas. Usa el botón de arriba para mostrarlas.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((m) => (
            <CustomMetricCardItem
              key={m.id}
              metric={m}
              workflowId={workflowId}
              dateRange={dateRange}
              scopeKey={scopeKey}
              onHide={() => toggleMetric(scopeKey, m.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
