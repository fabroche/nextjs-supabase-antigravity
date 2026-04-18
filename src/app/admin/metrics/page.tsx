"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { MetricsTable } from "@/components/admin/metrics-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useBusiness } from "@/contexts/business-context"
import { fetchAllMetricDefinitions, fetchCustomMetricsList, toggleCustomMetricActive } from "@/lib/supabase/queries"
import { Switch } from "@/components/ui/switch"
import type { DbMetricDefinition, DbCustomMetric } from "@/lib/supabase/types"

const FORMAT_LABELS: Record<string, string> = {
  number: "Número", currency: "Moneda", percent: "Porcentaje", tokens: "Tokens",
}

export default function AdminMetricsPage() {
  const { isAdmin } = useBusiness()
  const [definitions, setDefinitions] = useState<DbMetricDefinition[]>([])
  const [customMetrics, setCustomMetrics] = useState<DbCustomMetric[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [defs, custom] = await Promise.all([
        fetchAllMetricDefinitions(),
        fetchCustomMetricsList(),
      ])
      setDefinitions(defs)
      setCustomMetrics(custom)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin, load])

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <Card className="max-w-md">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Solo los administradores pueden acceder a esta sección.
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Métricas</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona los labels y visibilidad de las métricas preset del dashboard
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <Tabs defaultValue="generales">
        <TabsList>
          <TabsTrigger value="generales">Generales</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>

        <TabsContent value="generales" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Métricas preset</CardTitle>
              <CardDescription>
                Haz clic en un label para editarlo. Arrastra las filas para reordenar.
                El orden y visibilidad se aplican en todos los niveles del dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <MetricsTable initialDefinitions={definitions} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Métricas custom</CardTitle>
              <CardDescription>
                Métricas generadas vía SQL y asignadas a workflows específicos.
                Para crear nuevas, usa el Metric Builder con Claude.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : customMetrics.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No hay métricas custom registradas.
                </p>
              ) : (
                <div className="divide-y">
                  {customMetrics.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-3 gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.slug}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {FORMAT_LABELS[m.display_format] ?? m.display_format}
                        </Badge>
                        <Switch
                          checked={m.is_active}
                          onCheckedChange={async (v) => {
                            await toggleCustomMetricActive(m.id, v)
                            setCustomMetrics((prev) =>
                              prev.map((x) => x.id === m.id ? { ...x, is_active: v } : x)
                            )
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  )
}
