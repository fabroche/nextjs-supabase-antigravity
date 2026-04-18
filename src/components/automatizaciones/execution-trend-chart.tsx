"use client"

import { type RefObject } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { DbExecutionTrend } from "@/lib/supabase/types"

interface ExecutionTrendChartProps {
  data: DbExecutionTrend[]
  isLoading: boolean
  title?: string
  description?: string
  chartRef?: RefObject<HTMLDivElement | null>
}

export function ExecutionTrendChart({
  data,
  isLoading,
  title = "Tendencia de ejecuciones",
  description = "Últimos 30 días — exitosas vs errores",
  chartRef,
}: ExecutionTrendChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    day: format(new Date(d.day), "d MMM", { locale: es }),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[250px] w-full" />
        ) : data.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
            Sin datos de ejecución en los últimos 30 días
          </div>
        ) : (
          <div className="h-[250px]" ref={chartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formatted}>
                <defs>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorError" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend
                  formatter={(value) =>
                    value === "success_count" ? "Exitosas" : "Errores"
                  }
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "12px" }}
                />
                <Area
                  type="monotone"
                  dataKey="success_count"
                  name="success_count"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  fill="url(#colorSuccess)"
                />
                <Area
                  type="monotone"
                  dataKey="error_count"
                  name="error_count"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  fill="url(#colorError)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
