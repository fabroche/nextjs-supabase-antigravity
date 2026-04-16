'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportExecutionsToCSV } from '@/lib/utils/export'
import type { DbN8NExecution } from '@/lib/supabase/types'

interface ExportExecutionsButtonProps {
  data: DbN8NExecution[]
  workflowName: string
}

export function ExportExecutionsButton({ data, workflowName }: ExportExecutionsButtonProps) {
  const disabled = data.length === 0

  function handleExportCSV() {
    exportExecutionsToCSV(data, workflowName)
  }

  return (
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
