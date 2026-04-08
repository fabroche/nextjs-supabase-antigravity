import Papa from 'papaparse'
import type { DbTransaction } from '@/lib/supabase/types'
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
