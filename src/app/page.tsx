"use client"

import { DollarSign, Users, CreditCard, Activity } from "lucide-react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { MetricCard } from "@/components/dashboard/metric-card"
import { OverviewChart } from "@/components/dashboard/overview-chart"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useBusiness } from "@/contexts/business-context"

export default function DashboardPage() {
  const { selectedBusiness } = useBusiness()
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

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="analytics">Analíticas</TabsTrigger>
              <TabsTrigger value="reports">Reportes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Metric Cards */}
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

              {/* Charts and Activity */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4">
                  <OverviewChart data={selectedBusiness.chartData} />
                </div>
                <Card className="col-span-3">
                  <CardHeader>
                    <CardTitle>Actividad Reciente</CardTitle>
                    <CardDescription>
                      Últimas 5 transacciones realizadas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentActivity activities={selectedBusiness.recentActivity} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Analíticas</CardTitle>
                  <CardDescription>
                    Análisis detallado de tus métricas
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground">
                  Contenido de analíticas próximamente...
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Reportes</CardTitle>
                  <CardDescription>
                    Genera y descarga reportes personalizados
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground">
                  Contenido de reportes próximamente...
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
