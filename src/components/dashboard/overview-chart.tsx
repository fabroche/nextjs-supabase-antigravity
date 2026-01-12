"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Placeholder for chart - you can integrate a charting library like recharts later
export function OverviewChart() {
  const data = [
    { month: "Ene", value: 4000 },
    { month: "Feb", value: 3000 },
    { month: "Mar", value: 5000 },
    { month: "Abr", value: 4500 },
    { month: "May", value: 6000 },
    { month: "Jun", value: 5500 },
  ]

  const maxValue = Math.max(...data.map((d) => d.value))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen</CardTitle>
        <CardDescription>
          Métricas de los últimos 6 meses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-end justify-between gap-2">
          {data.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-primary/20 rounded-t-md relative" style={{ height: `${(item.value / maxValue) * 100}%`, minHeight: '20px' }}>
                <div className="absolute inset-0 bg-primary rounded-t-md hover:bg-primary/80 transition-colors" />
              </div>
              <span className="text-xs text-muted-foreground">{item.month}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Integra una librería de gráficos como Recharts para visualizaciones avanzadas
        </div>
      </CardContent>
    </Card>
  )
}
