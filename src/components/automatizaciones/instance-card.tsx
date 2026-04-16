"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { DbInstanceStats } from "@/lib/supabase/types"

interface InstanceCardProps {
  instance: DbInstanceStats
}

const ENV_LABELS: Record<string, string> = {
  production: "Producción",
  staging: "Staging",
  development: "Desarrollo",
}

const ENV_VARIANTS: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  production: "default",
  staging: "secondary",
  development: "outline",
}

function getStatusDot(instance: DbInstanceStats): string {
  if (!instance.is_active) return "bg-muted-foreground"
  if (instance.error_rate >= 10) return "bg-destructive"
  if (instance.error_rate >= 5) return "bg-yellow-500"
  return "bg-green-500"
}

export function InstanceCard({ instance }: InstanceCardProps) {
  return (
    <Link href={`/automatizaciones/${instance.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  "shrink-0 h-2.5 w-2.5 rounded-full",
                  getStatusDot(instance)
                )}
              />
              <CardTitle className="text-base truncate">{instance.name}</CardTitle>
            </div>
            <Badge
              variant={ENV_VARIANTS[instance.environment] ?? "outline"}
              className="shrink-0 text-xs"
            >
              {ENV_LABELS[instance.environment] ?? instance.environment}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Ejecuciones</p>
              <p className="font-semibold">
                {instance.total_executions.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Tasa error</p>
              <p
                className={cn(
                  "font-semibold",
                  instance.error_rate === 0
                    ? "text-green-600 dark:text-green-400"
                    : instance.error_rate < 5
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-destructive"
                )}
              >
                {instance.error_rate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Costo (30d)</p>
              <p className="font-semibold">${instance.total_cost.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Workflows</p>
              <p className="font-semibold">{instance.workflow_count}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {instance.last_execution_at
              ? `Última ejec. ${formatDistanceToNow(
                  new Date(instance.last_execution_at),
                  { addSuffix: true, locale: es }
                )}`
              : "Sin ejecuciones aún"}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
