"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, Briefcase, Cog, Archive, RotateCcw, EyeOff, Server } from "lucide-react"
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

const NO_INSTANCE = "Sin instancia"

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

  async function handleClassify(
    u: UntrackedEventType,
    category: "business" | "system",
    status: "active" | "archived" = "active",
  ) {
    const k = `${u.workflow_id}:${u.event_type}`
    setBusy(k)
    try {
      await classifyEventType(u.workflow_id, u.event_type, category, status)
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

  // Catálogo: instancia → workflow → tipos
  const catByInstance = catalog.reduce<Record<string, Record<string, DbEventType[]>>>((acc, t) => {
    const inst = t.n8n_workflows?.n8n_instances?.name ?? NO_INSTANCE
    const wf = t.n8n_workflows?.name ?? t.workflow_id
    ;((acc[inst] ||= {})[wf] ||= []).push(t)
    return acc
  }, {})

  // Sin clasificar: instancia → tipos
  const untByInstance = untracked.reduce<Record<string, UntrackedEventType[]>>((acc, u) => {
    ;(acc[u.instance_name ?? NO_INSTANCE] ||= []).push(u)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      {/* Catálogo actual: instancia → workflow */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Catálogo actual</h3>
          <p className="text-xs text-muted-foreground">
            Vocabulario válido por workflow, agrupado por instancia. N8N lo consume; las métricas
            se definen sobre estos tipos.
          </p>
        </div>
        {catalog.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">El catálogo está vacío.</p>
        ) : (
          <div className="space-y-5">
            {Object.entries(catByInstance).map(([inst, workflows]) => (
              <div key={inst} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  {inst}
                </div>
                {Object.entries(workflows).map(([wf, types]) => (
                  <div key={wf} className="rounded-md border ml-1">
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
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tipos sin clasificar (auto-descubrimiento), agrupados por instancia */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Tipos sin clasificar</h3>
          <p className="text-xs text-muted-foreground">
            Detectados en las ejecuciones pero ausentes del catálogo. Clasifícalos para gobernarlos
            o ignóralos si no aplican.
          </p>
        </div>
        {untracked.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">
            ✓ Todo clasificado — no hay tipos pendientes.
          </p>
        ) : (
          <div className="space-y-5">
            {Object.entries(untByInstance).map(([inst, items]) => (
              <div key={inst} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  {inst}
                </div>
                <div className="divide-y rounded-md border ml-1">
                  {items.map((u) => {
                    const k = `${u.workflow_id}:${u.event_type}`
                    return (
                      <div key={k} className="flex items-center justify-between gap-4 px-3 py-2.5">
                        <div className="min-w-0">
                          <span className="font-mono text-sm">{u.event_type}</span>
                          <p className="text-xs text-muted-foreground truncate">
                            {u.workflow_name} · {u.cnt} ejecuciones
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
                              <Button size="sm" variant="ghost" onClick={() => handleClassify(u, "business", "archived")}>
                                <EyeOff className="mr-1.5 h-3.5 w-3.5" /> Ignorar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
