// Client-side only — imported dynamically to avoid SSR issues with @react-pdf/renderer
import React from 'react'
import { pdf, type DocumentProps } from '@react-pdf/renderer'
import { WorkflowPdfReport } from './workflow-report'
import type { PdfReportHeader, PdfReportSections } from './workflow-report'
import type { DbWorkflowMetricsByRange, DbMetricDefinition } from '@/lib/supabase/types'

export type { PdfReportHeader, PdfReportSections }

export async function generateWorkflowReport({
  header,
  sections,
  metrics,
  metricDefs,
  chartImage,
}: {
  header:      PdfReportHeader
  sections:    PdfReportSections
  metrics:     DbWorkflowMetricsByRange | null
  metricDefs:  DbMetricDefinition[]
  chartImage:  string | null
}): Promise<Blob> {
  const generatedAt = new Date().toLocaleDateString('es', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const defs = metricDefs.map((d) => ({ key: d.key, label: d.label, format: d.format }))

  const doc = React.createElement(WorkflowPdfReport, {
    header,
    sections,
    metrics,
    metricDefs: defs,
    chartImage,
    generatedAt,
  })

  return pdf(doc as React.ReactElement<DocumentProps>).toBlob()
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
