"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { GlobalMetrics } from "@/components/automatizaciones/global-metrics"
import { InstanceCard } from "@/components/automatizaciones/instance-card"
import { useN8NExecutions } from "@/hooks/use-n8n-executions"
import { useBusiness } from "@/contexts/business-context"
import { fetchInstanceStats, fetchGlobalAutomationMetrics } from "@/lib/supabase/queries"
import { Card, CardContent } from "@/components/ui/card"
import type { DbInstanceStats, AutomationGlobalMetrics } from "@/lib/supabase/types"

function InstanceCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <div className="flex justify-between">
          <div className="h-5 w-36 bg-muted rounded animate-pulse" />
          <div className="h-5 w-20 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              <div className="h-5 w-12 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="h-3 w-32 bg-muted rounded animate-pulse" />
      </CardContent>
    </Card>
  )
}

export default function AutomatizacionesPage() {
  const { selectedBusiness } = useBusiness()
  const [instances, setInstances] = useState<DbInstanceStats[]>([])
  const [globalMetrics, setGlobalMetrics] = useState<AutomationGlobalMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { lastExecutionAt } = useN8NExecutions()

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    Promise.all([
      fetchInstanceStats(selectedBusiness?.id),
      fetchGlobalAutomationMetrics(selectedBusiness?.id),
    ])
      .then(([stats, metrics]) => {
        if (!cancelled) {
          setInstances(stats)
          setGlobalMetrics(metrics)
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedBusiness?.id])

  // Silent refresh when a new execution arrives via Realtime
  useEffect(() => {
    if (!lastExecutionAt) return
    Promise.all([
      fetchInstanceStats(selectedBusiness?.id),
      fetchGlobalAutomationMetrics(selectedBusiness?.id),
    ])
      .then(([stats, metrics]) => {
        setInstances(stats)
        setGlobalMetrics(metrics)
      })
      .catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastExecutionAt])

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automatizaciones</h1>
          <p className="text-muted-foreground">Instancias N8N y métricas de ejecución</p>
        </div>
      </div>

      <GlobalMetrics metrics={globalMetrics} isLoading={isLoading} />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <InstanceCardSkeleton />
          <InstanceCardSkeleton />
          <InstanceCardSkeleton />
        </div>
      ) : instances.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No hay instancias N8N registradas para este negocio.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {instances.map((instance) => (
            <InstanceCard key={instance.id} instance={instance} />
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
