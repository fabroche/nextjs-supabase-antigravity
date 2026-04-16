import Papa from 'papaparse'
import type { DbTransaction, DbN8NExecution } from '@/lib/supabase/types'
import { format } from 'date-fns'

function transactionsToRows(data: DbTransaction[]) {
  return data.map((t) => ({
    Fecha: format(new Date(t.created_at), 'dd/MM/yyyy'),
    Concepto: t.concept ?? '',
    Categoria: t.category ?? '',
    Monto: t.amount,
    Estado: t.status,
    Cliente: t.customer_name,
    Email: t.customer_email,
  }))
}

export function exportToCSV(
  data: DbTransaction[],
  businessName: string,
  from: Date,
  to: Date
): void {
  const rows = transactionsToRows(data)
  const csv = Papa.unparse(rows)
  const filename = `reporte-${businessName.toLowerCase().replace(/\s+/g, '-')}-${format(from, 'yyyy-MM-dd')}-${format(to, 'yyyy-MM-dd')}.csv`

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportExecutionsToCSV(
  data: DbN8NExecution[],
  workflowName: string
): void {
  const rows = data.map((e) => ({
    Fecha: format(new Date(e.created_at), 'dd/MM/yyyy HH:mm'),
    Estado: e.status,
    Evento: e.event_type ?? '',
    Modelo: e.model_name ?? '',
    Tokens_Prompt: e.tokens_prompt,
    Tokens_Completion: e.tokens_completion,
    Tokens_Total: e.tokens_prompt + e.tokens_completion,
    Costo_USD: e.cost_usd,
    Duracion_ms: e.duration_ms ?? '',
    Nodo_Error: e.error_node ?? '',
    Mensaje_Error: e.error_message ?? '',
    Execution_ID: e.execution_id,
  }))

  const csv = Papa.unparse(rows)
  const filename = `ejecuciones-${workflowName.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.csv`

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
