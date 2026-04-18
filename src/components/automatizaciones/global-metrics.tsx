"use client"

import { useState, useEffect } from "react"
import { Activity, AlertCircle, DollarSign, Zap, Eye, type LucideIcon } from "lucide-react"
import { MetricCard } from "@/components/dashboard/metric-card"
import { MetricVisibilitySheet } from "@/components/dashboard/metric-visibility-sheet"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useBusiness } from "@/contexts/business-context"
import { useUiPreferences } from "@/hooks/use-ui-preferences"
import { fetchMetricDefinitions } from "@/lib/supabase/queries"
import type { AutomationGlobalMetrics, DbMetricDefinition } from "@/lib/supabase/types"

const SCOPE_KEY = "global"

const ICON_MAP: Record<string, LucideIcon> = {
  Activity, AlertCircle, DollarSign, Zap,
}

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

function getValue(key: string, metrics: AutomationGlobalMetrics): { value: string; change: string; changeType: "positive" | "negative" | "neutral" } {
  switch (key) {
    case "executions_total":
      return {
        value: metrics.total_executions.toLocaleString(),
        change: `${metrics.active_instances} instancia${metrics.active_instances !== 1 ? "s" : ""} activa${metrics.active_instances !== 1 ? "s" : ""}`,
        changeType: "neutral",
      }
    case "error_rate":
      return {
        value: `${metrics.error_rate.toFixed(1)}%`,
        change: `${metrics.error_count} error${metrics.error_count !== 1 ? "es" : ""} en 30 días`,
        changeType: metrics.error_rate === 0 ? "positive" : metrics.error_rate < 5 ? "neutral" : "negative",
      }
    case "total_cost_usd":
      return { value: `$${metrics.total_cost.toFixed(4)}`, change: "últimos 30 días", changeType: "neutral" }
    case "total_tokens":
      return { value: metrics.total_tokens.toLocaleString(), change: "prompt + completion", changeType: "neutral" }
    default:
      return { value: "—", change: "", changeType: "neutral" }
  }
}

export function GlobalMetrics({ metrics, isLoading }: GlobalMetricsProps) {
  const { selectedBusiness } = useBusiness()
  const { isHidden, getHiddenKeys, toggleMetric, showAll } = useUiPreferences()
  const [definitions, setDefinitions] = useState<DbMetricDefinition[]>([])

  useEffect(() => {
    fetchMetricDefinitions("global", selectedBusiness?.id)
      .then(setDefinitions)
      .catch(console.error)
  }, [selectedBusiness?.id])

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

  const hiddenKeys = getHiddenKeys(SCOPE_KEY)
  const visible = definitions.filter((d) => !isHidden(SCOPE_KEY, d.key))
  const allDefs = definitions

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <MetricVisibilitySheet
          definitions={allDefs}
          scopeKey={SCOPE_KEY}
          hiddenKeys={hiddenKeys}
          onToggle={toggleMetric}
          onShowAll={showAll}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {visible.map((def) => {
          const { value, change, changeType } = getValue(def.key, metrics)
          const Icon = ICON_MAP[def.icon ?? "Activity"] ?? Activity
          return (
            <div key={def.key} className="relative group">
              <MetricCard title={def.label} value={value} change={change} changeType={changeType} icon={Icon} />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => toggleMetric(SCOPE_KEY, def.key)}
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
