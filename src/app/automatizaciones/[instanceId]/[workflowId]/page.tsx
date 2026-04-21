"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronRight } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { WorkflowMetrics } from "@/components/automatizaciones/workflow-metrics"
import { CustomMetricCards } from "@/components/automatizaciones/custom-metric-cards"
import { WorkflowActionsMenu } from "@/components/automatizaciones/workflow-actions-menu"
import { ExecutionTrendChart } from "@/components/automatizaciones/execution-trend-chart"
import { ExecutionFiltersBar } from "@/components/automatizaciones/execution-filters"
import { ExecutionTable } from "@/components/automatizaciones/execution-table"
import { ExportExecutionsButton } from "@/components/automatizaciones/export-button"
import { useN8NExecutions } from "@/hooks/use-n8n-executions"
import {
  fetchInstanceStats,
  fetchWorkflowStats,
  fetchExecutionTrend,
  fetchExecutions,
  fetchWorkflowMetricsByRange,
  fetchMetricDefinitions,
} from "@/lib/supabase/queries"
import { useBusiness } from "@/contexts/business-context"
import { DEFAULT_METRIC_DEFINITIONS } from "@/lib/metric-defaults"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  DbInstanceStats,
  DbWorkflowStats,
  DbWorkflowMetricsByRange,
  DbN8NExecution,
  DbExecutionTrend,
  DbMetricDefinition,
  ExecutionFilters,
} from "@/lib/supabase/types"

export default function WorkflowDetailPage() {
  const params = useParams<{ instanceId: string; workflowId: string }>()
  const { instanceId, workflowId } = params
  const router = useRouter()
  const { selectedBusiness } = useBusiness()
  const chartRef = useRef<HTMLDivElement>(null)

  const [instance, setInstance] = useState<DbInstanceStats | null>(null)
  const [workflow, setWorkflow] = useState<DbWorkflowStats | null>(null)
  const [trend, setTrend] = useState<DbExecutionTrend[]>([])
  const [rangeMetrics, setRangeMetrics] = useState<DbWorkflowMetricsByRange | null>(null)
  const [executions, setExecutions] = useState<DbN8NExecution[]>([])
  const [executionCount, setExecutionCount] = useState(0)
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<ExecutionFilters>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isTrendLoading, setIsTrendLoading] = useState(true)
  const [isRangeMetricsLoading, setIsRangeMetricsLoading] = useState(false)
  const [isTableLoading, setIsTableLoading] = useState(true)
  const [metricDefs, setMetricDefs] = useState<DbMetricDefinition[]>(DEFAULT_METRIC_DEFINITIONS.workflow)
  const { lastExecutionAt } = useN8NExecutions()

  useEffect(() => {
    fetchMetricDefinitions("workflow", selectedBusiness?.id)
      .then((defs) => { if (defs.length > 0) setMetricDefs(defs) })
      .catch(() => {})
  }, [selectedBusiness?.id])

  // Load breadcrumb + static metrics (all-time view)
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    Promise.all([
      fetchInstanceStats(),
      fetchWorkflowStats(instanceId),
    ])
      .then(([allStats, wfStats]) => {
        if (cancelled) return
        setInstance(allStats.find((s) => s.id === instanceId) ?? null)
        setWorkflow(wfStats.find((w) => w.id === workflowId) ?? null)
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [instanceId, workflowId])

  // Load trend — respects active date range
  const loadTrend = useCallback(
    async (from?: Date, to?: Date) => {
      setIsTrendLoading(true)
      try {
        const data = await fetchExecutionTrend(instanceId, workflowId, 30, from, to)
        setTrend(data)
      } catch (err) {
        console.error("Error loading trend:", err)
      } finally {
        setIsTrendLoading(false)
      }
    },
    [instanceId, workflowId]
  )

  // Load range metrics (only when a date range is active)
  const loadRangeMetrics = useCallback(
    async (from: Date, to: Date) => {
      setIsRangeMetricsLoading(true)
      try {
        const data = await fetchWorkflowMetricsByRange(workflowId, from, to)
        setRangeMetrics(data)
      } catch (err) {
        console.error("Error loading range metrics:", err)
      } finally {
        setIsRangeMetricsLoading(false)
      }
    },
    [workflowId]
  )

  // Reload trend + range metrics whenever the date range in filters changes
  useEffect(() => {
    if (filters.from && filters.to) {
      loadTrend(filters.from, filters.to)
      loadRangeMetrics(filters.from, filters.to)
    } else {
      setRangeMetrics(null)
      loadTrend()
    }
  }, [filters.from, filters.to, loadTrend, loadRangeMetrics])

  // Load paginated executions
  const loadExecutions = useCallback(
    async (targetPage: number, targetFilters: ExecutionFilters) => {
      setIsTableLoading(true)
      try {
        const { data, count } = await fetchExecutions(workflowId, targetFilters, targetPage)
        setExecutions(data)
        setExecutionCount(count)
      } catch (err) {
        console.error("Error loading executions:", err)
      } finally {
        setIsTableLoading(false)
      }
    },
    [workflowId]
  )

  useEffect(() => {
    loadExecutions(page, filters)
  }, [loadExecutions, page, filters])

  // Refresh on new execution (Realtime)
  useEffect(() => {
    if (!lastExecutionAt) return
    loadExecutions(page, filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastExecutionAt])

  function handleFiltersChange(newFilters: ExecutionFilters) {
    setPage(0)
    setFilters(newFilters)
  }

  const activeRange =
    filters.from && filters.to
      ? { from: filters.from, to: filters.to }
      : null

  const trendDescription = activeRange
    ? `${format(activeRange.from, "d MMM", { locale: es })} – ${format(activeRange.to, "d MMM yyyy", { locale: es })} · exitosas vs errores`
    : "Últimos 30 días — exitosas vs errores"

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/automatizaciones" className="hover:text-foreground transition-colors">
          Automatizaciones
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        {isLoading ? (
          <Skeleton className="h-4 w-28" />
        ) : (
          <Link
            href={`/automatizaciones/${instanceId}`}
            className="hover:text-foreground transition-colors"
          >
            {instance?.name ?? "Instancia"}
          </Link>
        )}
        <ChevronRight className="h-3.5 w-3.5" />
        {isLoading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <span className="text-foreground font-medium">
            {workflow?.name ?? "Workflow"}
          </span>
        )}
        {!isLoading && workflow && (
          <div onClick={(e) => e.stopPropagation()}>
            <WorkflowActionsMenu
              workflow={workflow}
              onMutated={() => {
                Promise.all([
                  fetchInstanceStats(),
                  fetchWorkflowStats(instanceId),
                ]).then(([allStats, wfStats]) => {
                  setInstance(allStats.find((s) => s.id === instanceId) ?? null)
                  setWorkflow(wfStats.find((w) => w.id === workflowId) ?? null)
                }).catch(console.error)
              }}
              onArchived={() => router.push(`/automatizaciones/${instanceId}`)}
            />
          </div>
        )}
      </nav>

      <WorkflowMetrics
        workflow={workflow}
        isLoading={isLoading}
        rangeMetrics={rangeMetrics}
        isRangeLoading={isRangeMetricsLoading}
        dateRange={activeRange}
      />

      <CustomMetricCards workflowId={workflowId} dateRange={activeRange} />

      <ExecutionTrendChart
        data={trend}
        isLoading={isTrendLoading}
        title="Tendencia de ejecuciones"
        description={trendDescription}
        chartRef={chartRef}
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <ExecutionFiltersBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
          <ExportExecutionsButton
            data={executions}
            workflowName={workflow?.name ?? "workflow"}
            workflow={workflow}
            activeRange={activeRange}
            chartRef={chartRef}
            metricDefs={metricDefs}
          />
        </div>
        <ExecutionTable
          data={executions}
          count={executionCount}
          page={page}
          onPageChange={setPage}
          isLoading={isTableLoading}
        />
      </div>
    </DashboardLayout>
  )
}
