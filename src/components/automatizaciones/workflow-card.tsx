"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { DbWorkflowStats } from "@/lib/supabase/types"

interface WorkflowCardProps {
  workflow: DbWorkflowStats
}

function getStatusDot(workflow: DbWorkflowStats): string {
  if (!workflow.is_active) return "bg-muted-foreground"
  if (workflow.error_rate >= 10) return "bg-destructive"
  if (workflow.error_rate >= 5) return "bg-yellow-500"
  return "bg-green-500"
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  return (
    <Link href={`/automatizaciones/${workflow.instance_id}/${workflow.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <span
                className={cn(
                  "shrink-0 mt-1 h-2.5 w-2.5 rounded-full",
                  getStatusDot(workflow)
                )}
              />
              <CardTitle className="text-sm line-clamp-2 leading-snug">{workflow.name}</CardTitle>
            </div>
          </div>
          {workflow.tags && workflow.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {workflow.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
              {workflow.tags.length > 3 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  +{workflow.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Ejecuciones</p>
              <p className="font-semibold">
                {workflow.total_executions.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Tasa error</p>
              <p
                className={cn(
                  "font-semibold",
                  workflow.error_rate === 0
                    ? "text-green-600 dark:text-green-400"
                    : workflow.error_rate < 5
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-destructive"
                )}
              >
                {workflow.error_rate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Costo (30d)</p>
              <p className="font-semibold">${workflow.total_cost.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Tokens</p>
              <p className="font-semibold">
                {workflow.total_tokens.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {workflow.last_execution_at
              ? `Última ejec. ${formatDistanceToNow(
                  new Date(workflow.last_execution_at),
                  { addSuffix: true, locale: es }
                )}`
              : "Sin ejecuciones aún"}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
