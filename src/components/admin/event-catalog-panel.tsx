"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, Briefcase, Cog, Archive, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  fetchEventTypesAll,
  fetchUntrackedEventTypes,
  classifyEventType,
  setEventTypeStatus,
} from "@/lib/supabase/queries"
import type { DbEventType, UntrackedEventType } from "@/lib/supabase/types"

export function EventCatalogPanel() {
  const [catalog, setCatalog] = useState<DbEventType[]>([])
  const [untracked, setUntracked] = useState<UntrackedEventType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [cat, unt] = await Promise.all([fetchEventTypesAll(), fetchUntrackedEventTypes()])
      setCatalog(cat)
      setUntracked(unt)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleClassify(u: UntrackedEventType, category: "business" | "system") {
    const k = `${u.workflow_id}:${u.event_type}`
    setBusy(k)
    try {
      await classifyEventType(u.workflow_id, u.event_type, category)
      await load()
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(null)
    }
  }

  async function handleStatus(t: DbEventType, status: "active" | "archived") {
    setBusy(t.id)
    try {
      await setEventTypeStatus(t.id, status)
      setCatalog((prev) => prev.map((x) => (x.id === t.id ? { ...x, status } : x)))
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    )
  }

  // Agrupar catálogo por workflow
  const byWorkflow = catalog.reduce<Record<string, DbEventType[]>>((acc, t) => {
    const name = t.n8n_workflows?.name ?? t.workflow_id
    ;(acc[name] ||= []).push(t)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      {/* Catálogo actual, agrupado por workflow */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Catálogo actual</h3>
          <p className="text-xs text-muted-foreground">
            Vocabulario válido por workflow. N8N lo consume; las métricas se definen sobre estos tipos.
          </p>
        </div>
        {catalog.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">El catálogo está vacío.</p>
        ) : (
          Object.entries(byWorkflow).map(([wf, types]) => (
            <div key={wf} className="rounded-md border">
              <div className="border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                {wf}
              </div>
              <div className="divide-y">
                {types.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-4 px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`font-mono text-sm ${t.status === "archived" ? "line-through text-muted-foreground" : ""}`}>
                        {t.key}
                      </span>
                      <Badge variant={t.category === "system" ? "secondary" : "outline"} className="text-[10px]">
                        {t.category}
                      </Badge>
                      {t.is_default && <Badge variant="outline" className="text-[10px]">default</Badge>}
                    </div>
                    <div className="shrink-0">
                      {busy === t.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : t.status === "archived" ? (
                        <Button size="sm" variant="ghost" onClick={() => handleStatus(t, "active")}>
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restaurar
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => handleStatus(t, "archived")}>
                          <Archive className="mr-1.5 h-3.5 w-3.5" /> Archivar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Tipos sin clasificar (auto-descubrimiento) */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Tipos sin clasificar</h3>
          <p className="text-xs text-muted-foreground">
            Detectados en las ejecuciones pero ausentes del catálogo. Clasifícalos para gobernarlos.
          </p>
        </div>
        {untracked.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">
            ✓ Todo clasificado — no hay tipos pendientes.
          </p>
        ) : (
          <div className="divide-y rounded-md border">
            {untracked.map((u) => {
              const k = `${u.workflow_id}:${u.event_type}`
              return (
                <div key={k} className="flex items-center justify-between gap-4 px-3 py-2.5">
                  <div className="min-w-0">
                    <span className="font-mono text-sm">{u.event_type}</span>
                    <p className="text-xs text-muted-foreground truncate">
                      {u.instance_name} · {u.workflow_name} · {u.cnt} ejecuciones
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {busy === k ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleClassify(u, "business")}>
                          <Briefcase className="mr-1.5 h-3.5 w-3.5" /> Negocio
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleClassify(u, "system")}>
                          <Cog className="mr-1.5 h-3.5 w-3.5" /> Sistema
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
