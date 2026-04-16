"use client"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EXECUTIONS_PAGE_SIZE } from "@/lib/supabase/queries"
import type { DbN8NExecution } from "@/lib/supabase/types"

interface ExecutionTableProps {
  data: DbN8NExecution[]
  count: number
  page: number
  onPageChange: (page: number) => void
  isLoading: boolean
}

const STATUS_STYLES: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  success: "default",
  error: "destructive",
  warning: "secondary",
  running: "outline",
}

const STATUS_LABELS: Record<string, string> = {
  success: "Exitosa",
  error: "Error",
  warning: "Advertencia",
  running: "Ejecutando",
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—"
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms / 60_000)}m`
}

function TableRowSkeleton() {
  return (
    <TableRow>
      {[...Array(8)].map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  )
}

export function ExecutionTable({
  data,
  count,
  page,
  onPageChange,
  isLoading,
}: ExecutionTableProps) {
  const totalPages = Math.ceil(count / EXECUTIONS_PAGE_SIZE)
  const from = page * EXECUTIONS_PAGE_SIZE + 1
  const to = Math.min((page + 1) * EXECUTIONS_PAGE_SIZE, count)

  return (
    <div className="space-y-3">
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead className="text-right">Tokens</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-right">Duración</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
              </>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  No hay ejecuciones que coincidan con los filtros
                </TableCell>
              </TableRow>
            ) : (
              data.map((exec) => (
                <TableRow key={exec.id}>
                  <TableCell className="text-sm">
                    {format(new Date(exec.created_at), "d MMM HH:mm", {
                      locale: es,
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_STYLES[exec.status] ?? "outline"}>
                      {STATUS_LABELS[exec.status] ?? exec.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {exec.event_type ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {exec.model_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {exec.tokens_prompt + exec.tokens_completion > 0
                      ? (exec.tokens_prompt + exec.tokens_completion).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {exec.cost_usd > 0 ? `$${exec.cost_usd.toFixed(5)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatDuration(exec.duration_ms)}
                  </TableCell>
                  <TableCell className="text-sm max-w-[220px]">
                    {exec.error_message ? (
                      <span
                        className="text-destructive truncate block"
                        title={exec.error_message}
                      >
                        {exec.error_node ? (
                          <span className="font-medium">{exec.error_node}: </span>
                        ) : null}
                        {exec.error_message.slice(0, 80)}
                        {exec.error_message.length > 80 ? "…" : ""}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {count > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {isLoading ? "—" : `${from}–${to} de ${count} ejecuciones`}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0 || isLoading}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1 || isLoading}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

    </div>
  )
}
