'use client'

import { useState, type RefObject } from 'react'
import { Download, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PdfReportDialog } from './pdf-report-dialog'
import { exportExecutionsToCSV } from '@/lib/utils/export'
import type { DbN8NExecution, DbWorkflowStats, DbMetricDefinition } from '@/lib/supabase/types'

interface ExportExecutionsButtonProps {
  data: DbN8NExecution[]
  workflowName: string
  workflow?: DbWorkflowStats | null
  activeRange?: { from: Date; to: Date } | null
  chartRef?: RefObject<HTMLDivElement | null>
  metricDefs?: DbMetricDefinition[]
}

export function ExportExecutionsButton({
  data,
  workflowName,
  workflow,
  activeRange,
  chartRef,
  metricDefs = [],
}: ExportExecutionsButtonProps) {
  const [pdfOpen, setPdfOpen] = useState(false)
  const disabled = data.length === 0

  function handleExportCSV() {
    exportExecutionsToCSV(data, workflowName)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={disabled}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportCSV}>
            Exportar CSV
          </DropdownMenuItem>
          {workflow && chartRef && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPdfOpen(true)}>
                <FileDown className="mr-2 h-3.5 w-3.5" />
                Reporte PDF (cliente)
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {workflow && chartRef && (
        <PdfReportDialog
          open={pdfOpen}
          onOpenChange={setPdfOpen}
          workflow={workflow}
          activeRange={activeRange ?? null}
          chartRef={chartRef}
          metricDefs={metricDefs}
        />
      )}
    </>
  )
}
