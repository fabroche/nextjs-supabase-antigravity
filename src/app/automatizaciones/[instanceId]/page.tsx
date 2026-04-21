"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { InstanceMetrics } from "@/components/automatizaciones/instance-metrics"
import { WorkflowCard } from "@/components/automatizaciones/workflow-card"
import { ExecutionTrendChart } from "@/components/automatizaciones/execution-trend-chart"
import { useN8NExecutions } from "@/hooks/use-n8n-executions"
import {
  fetchInstanceStats,
  fetchWorkflowStats,
  fetchExecutionTrend,
} from "@/lib/supabase/queries"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { DbInstanceStats, DbWorkflowStats, DbExecutionTrend } from "@/lib/supabase/types"

function WorkflowCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <div className="h-5 w-36 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              <div className="h-5 w-12 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function InstanceDetailPage() {
  const params = useParams<{ instanceId: string }>()
  const instanceId = params.instanceId

  const [instance, setInstance] = useState<DbInstanceStats | null>(null)
  const [workflows, setWorkflows] = useState<DbWorkflowStats[]>([])
  const [trend, setTrend] = useState<DbExecutionTrend[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTrendLoading, setIsTrendLoading] = useState(true)
  const { lastExecutionAt } = useN8NExecutions()

  async function loadData(showLoading = false) {
    if (showLoading) setIsLoading(true)
    try {
      const [allStats, wfStats] = await Promise.all([
        fetchInstanceStats(),
        fetchWorkflowStats(instanceId),
      ])
      const instanceStats = allStats.find((s) => s.id === instanceId) ?? null
      setInstance(instanceStats)
      setWorkflows(wfStats)
    } catch (err) {
      console.error("Error loading instance detail:", err)
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  async function loadTrend() {
    setIsTrendLoading(true)
    try {
      const trendData = await fetchExecutionTrend(instanceId, undefined, 30)
      setTrend(trendData)
    } catch (err) {
      console.error("Error loading trend:", err)
    } finally {
      setIsTrendLoading(false)
    }
  }

  useEffect(() => {
    loadData(true)
    loadTrend()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId])

  // Silent refresh on new executions
  useEffect(() => {
    if (!lastExecutionAt) return
    loadData()
    loadTrend()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastExecutionAt])

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/automatizaciones" className="hover:text-foreground transition-colors">
          Automatizaciones
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        {isLoading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <span className="text-foreground font-medium">
            {instance?.name ?? "Instancia"}
          </span>
        )}
      </nav>

      <InstanceMetrics instance={instance} isLoading={isLoading} />

      <ExecutionTrendChart data={trend} isLoading={isTrendLoading} />

      <div>
        <h2 className="text-lg font-semibold mb-3">Workflows</h2>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <WorkflowCardSkeleton />
            <WorkflowCardSkeleton />
            <WorkflowCardSkeleton />
          </div>
        ) : workflows.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No hay workflows registrados para esta instancia.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workflows.map((wf) => (
              <WorkflowCard key={wf.id} workflow={wf} onMutated={() => loadData()} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
