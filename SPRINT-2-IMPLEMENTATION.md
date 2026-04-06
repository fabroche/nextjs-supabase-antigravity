# Sprint 2 — Guia de Implementacion Local

> **Para ejecutar en local** donde hay acceso completo a npm y shadcn registry.  
> Sigue los pasos en orden. Cada sección es autocontenida.

---

## Paso 1 — Instalar dependencias

```bash
# Componentes shadcn (requieren acceso al registry)
npx shadcn@latest add calendar
npx shadcn@latest add popover

# Exportacion CSV
npm install papaparse
npm install -D @types/papaparse

# date-fns y react-day-picker se instalan como peer deps de shadcn calendar
# Si no se instalaron automaticamente:
npm install date-fns react-day-picker
```

**Resultado esperado**: nuevos archivos en `src/components/ui/calendar.tsx` y `src/components/ui/popover.tsx`.

---

## Paso 2 — Nueva query en `src/lib/supabase/queries.ts`

Agregar al final del archivo:

```typescript
// Get transactions filtered by date range for the Reports tab
export async function fetchTransactionsByDateRange(
  businessId: string,
  from: Date,
  to: Date
): Promise<DbTransaction[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
```

**Nota**: `DbTransaction` ya tiene todos los campos que necesita la tabla de reportes (`id`, `created_at`, `concept`, `category`, `amount`, `status`). No se necesita interfaz nueva.

---

## Paso 3 — Crear `src/lib/utils/export.ts`

```typescript
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
```

---

## Paso 4 — Crear `src/components/reports/date-range-picker.tsx`

```tsx
'use client'

import * as React from 'react'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DateRangePickerProps {
  onDateRangeChange: (from: Date, to: Date) => void
  className?: string
}

const PRESETS = [
  {
    label: 'Última semana',
    getRange: () => ({ from: subDays(new Date(), 7), to: new Date() }),
  },
  {
    label: 'Último mes',
    getRange: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }),
  },
  {
    label: 'Últimos 3 meses',
    getRange: () => ({ from: startOfMonth(subMonths(new Date(), 3)), to: new Date() }),
  },
]

export function DateRangePicker({ onDateRangeChange, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [range, setRange] = React.useState<DateRange | undefined>()

  function handleSelect(selected: DateRange | undefined) {
    setRange(selected)
  }

  function handlePreset(getRange: () => { from: Date; to: Date }) {
    const { from, to } = getRange()
    setRange({ from, to })
  }

  function handleApply() {
    if (range?.from && range?.to) {
      onDateRangeChange(range.from, range.to)
      setOpen(false)
    }
  }

  const label =
    range?.from && range?.to
      ? `${format(range.from, 'dd MMM yyyy', { locale: es })} – ${format(range.to, 'dd MMM yyyy', { locale: es })}`
      : 'Seleccionar rango de fechas'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('w-[300px] justify-start text-left font-normal', !range && 'text-muted-foreground', className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Presets */}
          <div className="flex flex-col gap-1 border-r p-3">
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="justify-start text-sm"
                onClick={() => handlePreset(preset.getRange)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Calendar */}
          <div>
            <Calendar
              mode="range"
              selected={range}
              onSelect={handleSelect}
              numberOfMonths={2}
              locale={es}
              disabled={{ after: new Date() }}
            />
            <div className="border-t p-3 flex justify-end">
              <Button size="sm" disabled={!range?.from || !range?.to} onClick={handleApply}>
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

---

## Paso 5 — Crear `src/components/reports/report-table.tsx`

```tsx
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
                  <TableHead>Categoría</TableHead>
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
```

> **Nota**: Este componente importa `Badge` de shadcn. Si no esta instalado, ejecutar: `npx shadcn@latest add badge`  
> (En el proyecto actual ya esta instalado en `src/components/ui/badge.tsx`)

---

## Paso 6 — Crear `src/components/reports/export-button.tsx`

```tsx
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
```

---

## Paso 7 — Modificar `src/app/page.tsx`

### 7a. Agregar imports (al inicio del archivo, junto a los demas imports)

```tsx
import { useState, useCallback } from 'react'
import { DateRangePicker } from '@/components/reports/date-range-picker'
import { ReportTable } from '@/components/reports/report-table'
import { ExportButton } from '@/components/reports/export-button'
import { fetchTransactionsByDateRange } from '@/lib/supabase/queries'
import type { DbTransaction } from '@/lib/supabase/types'
```

### 7b. Agregar estado dentro del componente `DashboardPage` (antes del `return`)

```tsx
const [reportData, setReportData] = useState<DbTransaction[]>([])
const [isLoadingReport, setIsLoadingReport] = useState(false)
const [reportRange, setReportRange] = useState<{ from: Date; to: Date } | undefined>()

const handleDateRangeChange = useCallback(async (from: Date, to: Date) => {
  if (!selectedBusiness) return
  setReportRange({ from, to })
  setIsLoadingReport(true)
  try {
    const data = await fetchTransactionsByDateRange(selectedBusiness.id, from, to)
    setReportData(data)
  } catch (err) {
    console.error('Error fetching report:', err)
    setReportData([])
  } finally {
    setIsLoadingReport(false)
  }
}, [selectedBusiness])
```

### 7c. Reemplazar el `<TabsList>` y agregar `<TabsContent value="reports">`

```tsx
<Tabs defaultValue="overview" className="space-y-4">
  <TabsList>
    <TabsTrigger value="overview">Resumen</TabsTrigger>
    <TabsTrigger value="reports">Reportes</TabsTrigger>
  </TabsList>

  <TabsContent value="overview" className="space-y-4">
    {/* — sin cambios — */}
  </TabsContent>

  <TabsContent value="reports" className="space-y-4">
    <div className="flex flex-wrap items-center gap-3">
      <DateRangePicker onDateRangeChange={handleDateRangeChange} />
      <ExportButton
        data={reportData}
        businessName={selectedBusiness.name}
        from={reportRange?.from}
        to={reportRange?.to}
      />
    </div>
    <ReportTable
      data={reportData}
      isLoading={isLoadingReport}
      currency={selectedBusiness.currency}
    />
  </TabsContent>
</Tabs>
```

**Nota**: Al cambiar de negocio en el header, el `selectedBusiness` cambia y el reporte anterior queda stale. Para limpiar el estado del reporte al cambiar de negocio, agregar un `useEffect`:

```tsx
// Reset report when selected business changes
useEffect(() => {
  setReportData([])
  setReportRange(undefined)
}, [selectedBusiness?.id])
```

---

## Checklist de verificacion final

```bash
npm run build   # No debe haber errores de TypeScript ni imports rotos
npm run lint    # No debe haber warnings
```

- [ ] Tab "Reportes" visible junto a "Resumen"
- [ ] DateRangePicker abre calendario en español con presets
- [ ] Al aplicar un rango, la tabla se llena con datos de Supabase
- [ ] Resumen (totales) aparece encima de la tabla
- [ ] Estado vacio cuando no hay transacciones en ese rango
- [ ] Loading state mientras carga
- [ ] Boton "Exportar" deshabilitado cuando la tabla esta vacia
- [ ] CSV descarga con nombre que incluye negocio y rango de fechas
- [ ] Admin ve datos del negocio seleccionado, negocio solo el propio
- [ ] Al cambiar de negocio, el reporte anterior se limpia

---

_Creado: 2026-04-06_  
_Sprint: 2 — Para ejecucion en local_
