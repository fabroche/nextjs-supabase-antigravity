"use client"

import { useState, useEffect, useCallback } from "react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { CheckCheck, RefreshCw } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { fetchDeadLetters, resolveDeadLetter } from "@/lib/supabase/queries"
import { useBusiness } from "@/contexts/business-context"
import type { DbDeadLetter } from "@/lib/supabase/types"

const SOURCE_LABELS: Record<string, string> = {
  telegram: "Telegram",
  dokploy: "Dokploy",
  n8n: "N8N",
  notion: "Notion",
}

function TableRowSkeleton() {
  return (
    <TableRow>
      {[...Array(5)].map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  )
}

export default function DeadLettersPage() {
  const { isAdmin } = useBusiness()
  const [letters, setLetters] = useState<DbDeadLetter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchDeadLetters(false)
      setLetters(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin, load])

  async function handleResolve(id: string) {
    setResolvingId(id)
    try {
      await resolveDeadLetter(id)
      setLetters((prev) => prev.filter((l) => l.id !== id))
    } catch (err) {
      console.error(err)
    } finally {
      setResolvingId(null)
    }
  }

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
          <h1 className="text-2xl font-semibold">Dead Letters</h1>
          <p className="text-sm text-muted-foreground">
            Webhooks que fallaron al procesarse
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pendientes</CardTitle>
          <CardDescription>
            {isLoading ? "—" : `${letters.length} webhook${letters.length !== 1 ? "s" : ""} sin resolver`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-b-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="text-right">Reintentos</TableHead>
                  <TableHead>Recibido</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                  </>
                ) : letters.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-muted-foreground text-sm"
                    >
                      No hay webhooks pendientes — todo limpio
                    </TableCell>
                  </TableRow>
                ) : (
                  letters.map((letter) => (
                    <TableRow key={letter.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {SOURCE_LABELS[letter.source] ?? letter.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[320px]">
                        <span
                          className="text-sm text-destructive truncate block"
                          title={letter.error ?? ""}
                        >
                          {letter.error?.slice(0, 100) ?? "—"}
                          {(letter.error?.length ?? 0) > 100 ? "…" : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {letter.retries}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(letter.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResolve(letter.id)}
                          disabled={resolvingId === letter.id}
                          className="text-xs"
                        >
                          <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                          Resolver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
