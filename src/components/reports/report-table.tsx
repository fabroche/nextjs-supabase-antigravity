import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DbTransaction } from '@/lib/supabase/types'

interface ReportTableProps {
  data: DbTransaction[]
  isLoading: boolean
  currency: string
}

const STATUS_LABELS: Record<string, string> = {
  success: 'Completado',
  pending: 'Pendiente',
  failed: 'Cancelado',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  success: 'default',
  pending: 'secondary',
  failed: 'destructive',
}

function Summary({ data, currency }: { data: DbTransaction[]; currency: string }) {
  const total = data.reduce((sum, t) => sum + t.amount, 0)
  const completed = data.filter((t) => t.status === 'success').length
  const pending = data.filter((t) => t.status === 'pending').length
  const failed = data.filter((t) => t.status === 'failed').length

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
      {[
        { label: 'Total', value: `${currency}${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
        { label: 'Transacciones', value: data.length },
        { label: 'Completadas', value: completed },
        { label: 'Pendientes / Fallidas', value: `${pending} / ${failed}` },
      ].map(({ label, value }) => (
        <div key={label} className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      ))}
    </div>
  )
}

export function ReportTable({ data, isLoading, currency }: ReportTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Generando reporte...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultados</CardTitle>
        <CardDescription>
          {data.length === 0 ? 'Sin transacciones para el rango seleccionado.' : `${data.length} transacciones encontradas`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 && (
          <>
            <Summary data={data} currency={currency} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(t.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>{t.concept ?? '—'}</TableCell>
                    <TableCell>{t.category ?? '—'}</TableCell>
                    <TableCell className="text-sm">{t.customer_name}</TableCell>
                    <TableCell className="text-right font-medium">
                      {currency}{t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[t.status]}>
                        {STATUS_LABELS[t.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  )
}
