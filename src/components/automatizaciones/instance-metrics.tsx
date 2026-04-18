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
import type { DbInstanceStats, DbMetricDefinition } from "@/lib/supabase/types"

const ICON_MAP: Record<string, LucideIcon> = {
  Activity, AlertCircle, DollarSign, Zap,
}

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

function getValue(key: string, instance: DbInstanceStats): { value: string; change: string; changeType: "positive" | "negative" | "neutral" } {
  switch (key) {
    case "executions_total":
      return { value: instance.total_executions.toLocaleString(), change: `${instance.success_count} exitosas`, changeType: "positive" }
    case "error_rate":
      return {
        value: `${instance.error_rate.toFixed(1)}%`,
        change: `${instance.error_count} error${instance.error_count !== 1 ? "es" : ""}`,
        changeType: instance.error_rate === 0 ? "positive" : instance.error_rate < 5 ? "neutral" : "negative",
      }
    case "total_cost_usd":
      return { value: `$${instance.total_cost.toFixed(4)}`, change: "últimos 30 días", changeType: "neutral" }
    case "total_tokens":
      return { value: instance.total_tokens.toLocaleString(), change: `${instance.workflow_count} workflow${instance.workflow_count !== 1 ? "s" : ""}`, changeType: "neutral" }
    default:
      return { value: "—", change: "", changeType: "neutral" }
  }
}

export function InstanceMetrics({ instance, isLoading }: InstanceMetricsProps) {
  const { selectedBusiness } = useBusiness()
  const scopeKey = instance ? `instance:${instance.id}` : "instance"
  const { isHidden, getHiddenKeys, toggleMetric, showAll } = useUiPreferences()
  const [definitions, setDefinitions] = useState<DbMetricDefinition[]>([])

  useEffect(() => {
    fetchMetricDefinitions("instance", selectedBusiness?.id)
      .then(setDefinitions)
      .catch(console.error)
  }, [selectedBusiness?.id])

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
          const { value, change, changeType } = getValue(def.key, instance)
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
