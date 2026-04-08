'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportToCSV } from '@/lib/utils/export'
import type { DbTransaction } from '@/lib/supabase/types'

interface ExportButtonProps {
  data: DbTransaction[]
  businessName: string
  from: Date | undefined
  to: Date | undefined
}

export function ExportButton({ data, businessName, from, to }: ExportButtonProps) {
  const disabled = data.length === 0 || !from || !to

  function handleExportCSV() {
    if (!from || !to) return
    exportToCSV(data, businessName, from, to)
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
