"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Activity, AlertCircle, DollarSign, Zap, Eye, type LucideIcon } from "lucide-react"
import { MetricCard } from "@/components/dashboard/metric-card"
import { MetricVisibilitySheet } from "@/components/dashboard/metric-visibility-sheet"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useBusiness } from "@/contexts/business-context"
import { useUiPreferences } from "@/hooks/use-ui-preferences"
import { fetchMetricDefinitions } from "@/lib/supabase/queries"
import { DEFAULT_METRIC_DEFINITIONS } from "@/lib/metric-defaults"
import type { DbWorkflowStats, DbWorkflowMetricsByRange, DbMetricDefinition } from "@/lib/supabase/types"

const ICON_MAP: Record<string, LucideIcon> = {
  Activity, AlertCircle, DollarSign, Zap,
}

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

type StatsLike = DbWorkflowStats | DbWorkflowMetricsByRange

function getValue(key: string, stats: StatsLike, rangeLabel: string): { value: string; change: string; changeType: "positive" | "negative" | "neutral" } {
  switch (key) {
    case "executions_total":
      return { value: stats.total_executions.toLocaleString(), change: `${stats.success_count} exitosas`, changeType: "positive" }
    case "error_rate":
      return {
        value: `${stats.error_rate.toFixed(1)}%`,
        change: `${stats.error_count} error${stats.error_count !== 1 ? "es" : ""}`,
        changeType: stats.error_rate === 0 ? "positive" : stats.error_rate < 5 ? "neutral" : "negative",
      }
    case "total_cost_usd":
      return { value: `$${stats.total_cost.toFixed(4)}`, change: rangeLabel, changeType: "neutral" }
    case "total_tokens":
      return {
        value: stats.total_tokens.toLocaleString(),
        change: stats.avg_duration_ms !== null ? `Duración promedio: ${Math.round(stats.avg_duration_ms / 1000)}s` : "prompt + completion",
        changeType: "neutral",
      }
    default:
      return { value: "—", change: "", changeType: "neutral" }
  }
}

export function WorkflowMetrics({ workflow, isLoading, rangeMetrics, isRangeLoading, dateRange }: WorkflowMetricsProps) {
  const { selectedBusiness } = useBusiness()
  const scopeKey = workflow ? `workflow:${workflow.id}` : "workflow"
  const { isHidden, getHiddenKeys, toggleMetric, showAll } = useUiPreferences()
  const [definitions, setDefinitions] = useState<DbMetricDefinition[]>(DEFAULT_METRIC_DEFINITIONS.workflow)
  const showingRange = !!dateRange

  useEffect(() => {
    fetchMetricDefinitions("workflow", selectedBusiness?.id)
      .then((defs) => setDefinitions(defs.length > 0 ? defs : DEFAULT_METRIC_DEFINITIONS.workflow))
      .catch(() => setDefinitions(DEFAULT_METRIC_DEFINITIONS.workflow))
  }, [selectedBusiness?.id])

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

  const hiddenKeys = getHiddenKeys(scopeKey)
  const visible = definitions.filter((d) => !isHidden(scopeKey, d.key))

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <MetricVisibilitySheet
          definitions={definitions}
          scopeKey={scopeKey}
          hiddenKeys={hiddenKeys}
          onToggle={toggleMetric}
          onShowAll={showAll}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {visible.map((def) => {
          const { value, change, changeType } = getValue(def.key, stats, rangeLabel)
          const Icon = ICON_MAP[def.icon ?? "Activity"] ?? Activity
          return (
            <div key={def.key} className="relative group">
              <MetricCard title={def.label} value={value} change={change} changeType={changeType} icon={Icon} />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => toggleMetric(scopeKey, def.key)}
                title="Ocultar métrica"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
