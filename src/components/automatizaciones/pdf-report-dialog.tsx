"use client"

import { useState, useRef, type RefObject } from "react"
import { FileDown, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBusiness } from "@/contexts/business-context"
import { fetchWorkflowMetricsByRange } from "@/lib/supabase/queries"
import type { DbWorkflowStats, DbWorkflowMetricsByRange, DbMetricDefinition } from "@/lib/supabase/types"

interface PdfReportDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  workflow: DbWorkflowStats
  activeRange: { from: Date; to: Date } | null
  chartRef: RefObject<HTMLDivElement | null>
  metricDefs: DbMetricDefinition[]
}

export function PdfReportDialog({
  open,
  onOpenChange,
  workflow,
  activeRange,
  chartRef,
  metricDefs,
}: PdfReportDialogProps) {
  const { selectedBusiness } = useBusiness()
  const today = new Date()
  const defaultFrom = activeRange?.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const defaultTo   = activeRange?.to   ?? today

  const [title,       setTitle]       = useState(`Reporte — ${workflow.name}`)
  const [subtitle,    setSubtitle]    = useState("")
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait")
  const [sections, setSections] = useState({ metrics: true, trendChart: true, aggregateSummary: false })
  const [generating, setGenerating]   = useState(false)
  const [error, setError]             = useState<string | null>(null)

  function toggleSection(key: keyof typeof sections) {
    setSections((s) => ({ ...s, [key]: !s[key] }))
  }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      // 1. Capture chart PNG if needed
      let chartImage: string | null = null
      if (sections.trendChart && chartRef.current) {
        const { toPng } = await import('html-to-image')
        chartImage = await toPng(chartRef.current, { pixelRatio: 2, cacheBust: true })
      }

      // 2. Fetch aggregate metrics
      let metrics: DbWorkflowMetricsByRange | null = null
      if (sections.metrics || sections.aggregateSummary) {
        metrics = await fetchWorkflowMetricsByRange(workflow.id, defaultFrom, defaultTo)
      }

      // 3. Generate PDF (dynamic import to avoid SSR)
      const { generateWorkflowReport, downloadBlob } = await import('@/lib/pdf/generate')
      const blob = await generateWorkflowReport({
        header: {
          title,
          subtitle,
          dateRange: { from: defaultFrom, to: defaultTo },
          orientation,
          businessName: selectedBusiness?.name ?? 'Dashboard',
        },
        sections,
        metrics,
        metricDefs,
        chartImage,
      })

      const dateStr = format(today, 'yyyy-MM-dd')
      const safeName = workflow.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      downloadBlob(blob, `reporte-${safeName}-${dateStr}.pdf`)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el PDF')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Reporte PDF</DialogTitle>
          <DialogDescription>
            Genera un reporte del workflow <strong>{workflow.name}</strong> para entregar al cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="pdf-title">Título</Label>
            <Input id="pdf-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pdf-subtitle">Subtítulo (opcional)</Label>
            <Input id="pdf-subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Ej: Período Q1 2026" />
          </div>

          <div className="space-y-2">
            <Label>Orientación</Label>
            <Select value={orientation} onValueChange={(v) => setOrientation(v as "portrait" | "landscape")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Vertical (Portrait)</SelectItem>
                <SelectItem value="landscape">Horizontal (Landscape)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Secciones</Label>
            {[
              { key: "metrics",          label: "Métricas del workflow" },
              { key: "trendChart",       label: "Gráfica de tendencia" },
              { key: "aggregateSummary", label: "Resumen agregado de ejecuciones" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm">{label}</span>
                <Switch
                  checked={sections[key as keyof typeof sections]}
                  onCheckedChange={() => toggleSection(key as keyof typeof sections)}
                />
              </div>
            ))}
          </div>

          {activeRange && (
            <p className="text-xs text-muted-foreground">
              Rango activo: {format(activeRange.from, "d MMM")} – {format(activeRange.to, "d MMM yyyy")}
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileDown className="mr-1.5 h-4 w-4" />}
            {generating ? "Generando…" : "Generar PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
