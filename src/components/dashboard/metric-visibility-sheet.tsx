"use client"

import { Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import type { DbMetricDefinition } from "@/lib/supabase/types"

interface MetricVisibilitySheetProps {
  definitions: DbMetricDefinition[]
  scopeKey: string
  hiddenKeys: string[]
  onToggle: (scopeKey: string, metricKey: string) => void
  onShowAll: (scopeKey: string) => void
}

export function MetricVisibilitySheet({
  definitions,
  scopeKey,
  hiddenKeys,
  onToggle,
  onShowAll,
}: MetricVisibilitySheetProps) {
  const hiddenCount = hiddenKeys.length
  if (hiddenCount === 0) return null

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          Mostrar ocultas ({hiddenCount})
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Visibilidad de métricas</SheetTitle>
          <SheetDescription>
            Activa o desactiva cada métrica. Los cambios se guardan por usuario.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {definitions.map((def) => {
            const hidden = hiddenKeys.includes(def.key)
            return (
              <div key={def.key} className="flex items-center justify-between px-3 py-1">
                <Label htmlFor={`metric-${def.key}`} className="font-normal cursor-pointer">
                  {def.label}
                </Label>
                <Switch
                  id={`metric-${def.key}`}
                  checked={!hidden}
                  onCheckedChange={() => onToggle(scopeKey, def.key)}
                />
              </div>
            )
          })}
          <div className="pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => onShowAll(scopeKey)}>
              Mostrar todas
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
