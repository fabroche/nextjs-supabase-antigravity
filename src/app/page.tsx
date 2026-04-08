"use client"

import { useState, useCallback, useEffect } from "react"
import { DollarSign, Users, CreditCard, Activity } from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { MetricCard } from "@/components/dashboard/metric-card"
import { OverviewChart } from "@/components/dashboard/overview-chart"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { DateRangePicker } from "@/components/reports/date-range-picker"
import { ReportTable } from "@/components/reports/report-table"
import { ExportButton } from "@/components/reports/export-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { useBusiness } from "@/contexts/business-context"
import { fetchTransactionsByDateRange } from "@/lib/supabase/queries"
import type { DbTransaction } from "@/lib/supabase/types"

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

function ChartSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="h-5 w-20 bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-48 bg-muted rounded animate-pulse mb-6" />
        <div className="h-[300px] bg-muted rounded animate-pulse" />
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { selectedBusiness, isLoading, isLoadingData, error } = useBusiness()
  const [reportData, setReportData] = useState<DbTransaction[]>([])
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [reportRange, setReportRange] = useState<{ from: Date; to: Date } | undefined>()

  const handleDateRangeChange = useCallback(async (from: Date, to: Date) => {
    if (!selectedBusiness) return
    setReportRange({ from, to })
    setIsLoadingReport(true)
    try {
      const data = await fetchTransactionsByDateRange(selectedBusiness.id, from, to)
      setReportData(data)
    } catch (err) {
      console.error('Error fetching report:', err)
      setReportData([])
    } finally {
      setIsLoadingReport(false)
    }
  }, [selectedBusiness])

  // Reset report when selected business changes
  useEffect(() => {
    setReportData([])
    setReportRange(undefined)
  }, [selectedBusiness?.id])

  // Initial loading (auth + business list)
  if (isLoading || !selectedBusiness) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  const { metrics } = selectedBusiness

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{selectedBusiness.name}</h1>
              <p className="text-muted-foreground">
                  Resumen de métricas y actividad
              </p>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-4 text-destructive text-sm">
              Error: {error}
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="reports">Reportes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Metric Cards */}
              {isLoadingData ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <MetricCard
                    title="Ingresos Totales"
                    value={`$${metrics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    change={`+${metrics.revenueChange}% desde el mes pasado`}
                    changeType="positive"
                    icon={DollarSign}
                  />
                  <MetricCard
                    title="Usuarios Activos"
                    value={`+${metrics.activeUsers.toLocaleString()}`}
                    change={`+${metrics.usersChange}% desde el mes pasado`}
                    changeType="positive"
                    icon={Users}
                  />
                  <MetricCard
                    title="Ventas"
                    value={`+${metrics.sales.toLocaleString()}`}
                    change={`+${metrics.salesChange}% desde el mes pasado`}
                    changeType="positive"
                    icon={CreditCard}
                  />
                  <MetricCard
                    title="Activos Ahora"
                    value={`+${metrics.activeNow}`}
                    change={`+${metrics.activeNowChange} desde hace 1 hora`}
                    changeType="positive"
                    icon={Activity}
                  />
                </div>
              )}

              {/* Chart */}
              {isLoadingData ? (
                <ChartSkeleton />
              ) : (
                <OverviewChart data={selectedBusiness.chartData} />
              )}

              {/* Activity Feed */}
              <ActivityFeed />
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <DateRangePicker onDateRangeChange={handleDateRangeChange} />
                <ExportButton
                  data={reportData}
                  businessName={selectedBusiness.name}
                  from={reportRange?.from}
                  to={reportRange?.to}
                />
              </div>
              <ReportTable
                data={reportData}
                isLoading={isLoadingReport}
                currency={selectedBusiness.currency}
              />
            </TabsContent>

          </Tabs>
        </main>
      </div>
    </div>
  )
}
