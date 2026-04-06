# Sprint 2 — Plan de Implementación: Reportes

> **Estado**: Pendiente  
> **Fecha de creación**: 2026-04-01  
> **Dependencia**: Sprint 1 debe estar mergeado en `main` ✅  
> **Versión objetivo**: 0.5.0  
> **Actualización 2026-04-06**: No se necesitan datos mock — la DB está live con `transactions` reales. `DbTransaction` ya tiene los campos que el plan define como `ReportRow`. Solo crear `fetchTransactionsByDateRange()` query.

---

## Objetivo

Implementar la tab **"Reportes"** dentro del dashboard existente, permitiendo al usuario:

1. Seleccionar un rango de fechas mediante un calendario
2. Generar un reporte que se muestra en una tabla
3. Exportar el reporte en formato CSV u hoja de cálculo (Excel)

---

## Inventario de lo que ya existe

| Recurso | Estado | Notas |
|---------|--------|-------|
| `<Tabs>` en `page.tsx` | Disponible | Solo muestra "Resumen", se re-agrega "Reportes" |
| `<Table>` de shadcn | Instalado | `src/components/ui/table.tsx` — completo con Header, Body, Row, Cell, Footer |
| `<Card>` de shadcn | Instalado | Para envolver secciones del reporte |
| `<Button>` de shadcn | Instalado | Para acciones (generar, exportar) |
| `<Select>` de shadcn | Instalado | Para filtros adicionales si se necesitan |
| `zod` | Instalado | Validación de formularios |
| `react-hook-form` | Instalado | Manejo de formularios |
| `<Calendar>` de shadcn | **NO instalado** | Requiere instalación |
| `<Popover>` de shadcn | **NO instalado** | Necesario para el DateRangePicker |
| Librería de exportación CSV/Excel | **NO instalado** | Requiere instalación |

---

## Dependencias a Instalar

```bash
# 1. Componentes shadcn (instala también react-day-picker y @radix-ui/react-popover)
npx shadcn@latest add calendar
npx shadcn@latest add popover

# 2. Exportación de datos (elegir una opción)
# Opción A — Solo CSV (liviano, ~15KB)
npm install papaparse
npm install -D @types/papaparse

# Opción B — CSV + Excel (~180KB, más pesado pero más completo)
npm install xlsx
```

### Recomendación sobre librería de exportación

| | `papaparse` (CSV) | `xlsx` (Excel + CSV) |
|---|---|---|
| Tamaño | ~15KB gzipped | ~180KB gzipped |
| Formatos | Solo CSV | CSV, XLSX, XLS, ODS |
| Formato profesional | No (texto plano) | Sí (columnas, estilos básicos) |
| Instalación | `npm install papaparse` | `npm install xlsx` |

> **Observación**: Si los reportes son para uso interno del negocio, CSV es suficiente. Si se comparten con clientes o stakeholders, Excel da una presentación más profesional. Se recomienda **empezar con CSV** (`papaparse`) y agregar Excel más adelante si hay demanda.

---

## Estructura de Archivos Nuevos

```
src/
├── components/
│   ├── reports/
│   │   ├── date-range-picker.tsx    # Selector de rango de fechas
│   │   ├── report-table.tsx         # Tabla de resultados del reporte
│   │   └── export-button.tsx        # Botón de exportación CSV/Excel
│   └── ui/
│       ├── calendar.tsx             # (auto-generado por shadcn)
│       └── popover.tsx              # (auto-generado por shadcn)
├── lib/
│   ├── data/
│   │   └── mock-reports.ts          # Datos mock para reportes
│   └── utils/
│       └── export.ts                # Lógica de exportación CSV/Excel
```

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/app/page.tsx` | Re-agregar tab "Reportes" con `<TabsContent>` |
| `src/app/page.tsx` | Importar componentes de reportes |

---

## Implementación Detallada

### Paso 1: Instalar dependencias

Instalar los componentes shadcn y la librería de exportación.

### Paso 2: Crear datos mock para reportes

**Archivo**: `src/lib/data/mock-reports.ts`

```typescript
export interface ReportRow {
  id: string
  date: string              // ISO date string
  concept: string           // Descripción de la transacción
  category: string          // Categoría (venta, servicio, suscripción, etc.)
  amount: number            // Monto
  status: "completed" | "pending" | "cancelled"
}

export interface ReportSummary {
  totalAmount: number
  totalTransactions: number
  completedCount: number
  pendingCount: number
  cancelledCount: number
}
```

Cada negocio (Business) debe tener datos de reportes asociados, filtrados por `businessId` y rango de fechas.

> **Observación**: Los datos mock deben cubrir al menos 3 meses de transacciones para poder probar el filtro de fechas de forma realista. Considerar generar datos programáticamente en vez de hardcodearlos.

### Paso 3: Crear el DateRangePicker

**Archivo**: `src/components/reports/date-range-picker.tsx`

Combina el `<Calendar>` de shadcn con `<Popover>` para crear un selector de rango:

- Muestra un botón con el rango seleccionado (ej: "01 Mar 2026 - 31 Mar 2026")
- Al hacer click abre un popover con el calendario
- Permite seleccionar fecha inicio y fecha fin
- Incluye presets rápidos: "Última semana", "Último mes", "Últimos 3 meses"
- Callback `onDateRangeChange(from: Date, to: Date)`

> **Observación**: `react-day-picker` (dependencia del Calendar de shadcn) soporta `mode="range"` de forma nativa, lo cual simplifica mucho la implementación. No reinventar la selección de rangos.

> **Consideración de UX**: Incluir validación para que la fecha "desde" no sea posterior a la fecha "hasta". También limitar el rango máximo (ej: 1 año) para evitar consultas muy pesadas cuando se conecte a Supabase.

### Paso 4: Crear la tabla de reportes

**Archivo**: `src/components/reports/report-table.tsx`

Usa el componente `<Table>` existente de shadcn:

**Columnas**:
| Columna | Tipo | Notas |
|---------|------|-------|
| Fecha | `string` | Formato `DD/MM/YYYY` |
| Concepto | `string` | Descripción de la transacción |
| Categoría | `string` | Badge con color según categoría |
| Monto | `number` | Formato moneda `$X,XXX.XX` |
| Estado | `string` | Badge: verde (completed), amarillo (pending), rojo (cancelled) |

**Funcionalidades**:
- Mostrar resumen arriba de la tabla (total, cantidad de transacciones)
- Estado vacío cuando no hay datos para el rango seleccionado
- Loading state mientras se "generan" los datos

> **Consideración**: Para v0 con datos mock, la tabla básica de shadcn es suficiente. Si en el futuro se necesita ordenamiento por columnas, paginación o filtrado avanzado, migrar a `@tanstack/react-table`. No instalar esta dependencia hasta que sea necesaria.

### Paso 5: Crear el botón de exportación

**Archivo**: `src/components/reports/export-button.tsx`

- Botón con ícono de descarga (`Download` de lucide-react)
- Dropdown con opciones: "Exportar CSV" (y "Exportar Excel" si se instala `xlsx`)
- Deshabilitado cuando la tabla está vacía
- Genera el archivo y dispara descarga automática via `Blob` + `URL.createObjectURL`

**Archivo**: `src/lib/utils/export.ts`

```typescript
// Lógica de exportación separada de la UI
export function exportToCSV(data: ReportRow[], filename: string): void
export function exportToExcel(data: ReportRow[], filename: string): void // opcional
```

> **Observación**: El nombre del archivo exportado debe incluir el nombre del negocio y el rango de fechas, ej: `reporte-tech-solutions-2026-03-01-2026-03-31.csv`. Esto facilita la organización de archivos para el usuario.

### Paso 6: Integrar en page.tsx

Re-agregar la tab "Reportes" al `<TabsList>` existente:

```tsx
<Tabs defaultValue="overview" className="space-y-4">
  <TabsList>
    <TabsTrigger value="overview">Resumen</TabsTrigger>
    <TabsTrigger value="reports">Reportes</TabsTrigger>
  </TabsList>

  <TabsContent value="overview" className="space-y-4">
    {/* Métricas y chart existentes — sin cambios */}
  </TabsContent>

  <TabsContent value="reports" className="space-y-4">
    {/* Controles */}
    <div className="flex items-center gap-4">
      <DateRangePicker onDateRangeChange={handleDateChange} />
      <ExportButton data={reportData} businessName={selectedBusiness.name} />
    </div>
    
    {/* Tabla de resultados */}
    <ReportTable data={reportData} isLoading={isLoadingReport} />
  </TabsContent>
</Tabs>
```

---

## Flujo de Usuario

```
1. Usuario entra al Dashboard → Tab "Resumen" activa por defecto
2. Click en tab "Reportes"
3. Ve el DateRangePicker (sin datos hasta que seleccione rango)
4. Selecciona rango de fechas → Click "Generar Reporte"
5. Tabla se llena con datos filtrados por fecha y negocio
6. (Opcional) Click "Exportar CSV" → Se descarga el archivo
```

> **Consideración de UX**: Decidir si los datos se cargan automáticamente al cambiar las fechas o si se requiere un botón "Generar Reporte" explícito. La segunda opción es mejor cuando la consulta sea costosa (Supabase), pero con datos mock la primera es más fluida. Recomendación: **implementar con botón explícito** desde el inicio para que la migración a datos reales sea transparente.

---

## Consideraciones de Roles

El sistema de roles del Sprint 1 aplica directamente:

- **Admin**: Puede generar reportes de cualquier negocio (el que tenga seleccionado en el header)
- **Negocio**: Solo puede generar reportes de su propio negocio

No se requiere lógica adicional de roles ya que el `selectedBusiness` del contexto ya está filtrado por rol.

> **Observación importante**: Cuando se migre a datos reales de Supabase, la restricción de roles debe aplicarse también en el server-side (RLS policies o filtros en las queries), no solo en el cliente. El filtrado client-side es solo para UX, no para seguridad.

---

## Observaciones Arquitectónicas

### 1. Tab vs Ruta separada

Se decidió implementar Reportes como **tab** dentro del dashboard (`page.tsx`) en vez de como ruta separada (`/reports`). Implicaciones:

- **Pro**: Navegación más fluida, sin recarga de página, comparte contexto de negocio
- **Pro**: El estado del reporte (datos, fechas) se mantiene al cambiar entre tabs
- **Contra**: `page.tsx` crece en complejidad. Mitigar extrayendo toda la lógica a los componentes de `reports/`
- **Contra**: No se puede hacer deep-link directo a reportes con un rango específico

> **Recomendación**: Si en el futuro Reportes crece mucho (múltiples tipos de reportes, filtros complejos), considerar migrar a ruta dedicada `/reports` con su propio layout.

### 2. Estado del reporte

El estado del reporte (fechas seleccionadas, datos cargados) debe vivir en el `<TabsContent value="reports">` o en un hook dedicado `useReport()`. **No** agregarlo al business-context ya que es específico de esta sección.

### 3. Formato de fechas

El proyecto usa datos en español (meses "Ene", "Feb", etc.). Asegurar que:
- El calendario muestre nombres de días/meses en español
- Las fechas en la tabla usen formato `DD/MM/YYYY` (estándar hispano)
- `react-day-picker` soporta `locale` de `date-fns/locale/es`

> **Dependencia adicional posible**: `date-fns` para formateo y localización de fechas. Verificar si `react-day-picker` lo requiere como peer dependency.

### 4. Performance con datos reales (futuro)

Cuando se conecte a Supabase:
- Paginar los resultados en el server (no traer todo y paginar en cliente)
- Considerar un índice en la columna `date` de la tabla de transacciones
- Para exportación de datasets grandes, generar el CSV en el server via Edge Function

---

## Orden de Implementación Sugerido

| # | Tarea | Estimación |
|---|-------|------------|
| 1 | Instalar dependencias (shadcn calendar, popover, papaparse) | Setup |
| 2 | Crear `mock-reports.ts` con datos de prueba | Datos |
| 3 | Crear `date-range-picker.tsx` | Componente |
| 4 | Crear `report-table.tsx` | Componente |
| 5 | Crear `export.ts` + `export-button.tsx` | Componente + Utilidad |
| 6 | Integrar todo en `page.tsx` como tab "Reportes" | Integración |
| 7 | Verificar que roles filtren correctamente | QA |
| 8 | Actualizar `claude.md` y `SPRINT-1-PLAN.md` como completados | Docs |

---

## Criterios de Aceptación

- [ ] La tab "Reportes" aparece junto a "Resumen" en el dashboard
- [ ] El DateRangePicker permite seleccionar un rango de fechas con calendario visual
- [ ] Al generar reporte, la tabla muestra datos filtrados por fecha y negocio seleccionado
- [ ] La tabla muestra: fecha, concepto, categoría, monto, estado
- [ ] Se muestra un resumen (total, cantidad de transacciones) sobre la tabla
- [ ] El botón "Exportar CSV" descarga un archivo con los datos de la tabla
- [ ] El nombre del archivo incluye negocio y rango de fechas
- [ ] Admin ve reportes del negocio seleccionado, negocio ve solo los suyos
- [ ] Estado vacío cuando no hay datos para el rango seleccionado
- [ ] Loading state mientras se generan los datos
- [ ] La app compila sin errores (`npm run build`)
- [ ] No hay imports sin usar

---

## Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| `react-day-picker` no compatible con React 19 | Bloquea calendar | Verificar compatibilidad antes de instalar. Alternativa: input de fecha nativo |
| `page.tsx` se vuelve muy grande | Mantenibilidad | Extraer toda la lógica a componentes y hooks dedicados |
| Datos mock no representan la realidad | Reescritura en Sprint 3 | Diseñar la interfaz `ReportRow` pensando en el schema real de Supabase |
| Exportación de archivos grandes en cliente | Performance | Para v0 no es problema. En producción, mover a Edge Function |

---

_Fecha de creación: 2026-04-01_  
_Sprint: 2_  
_Versión objetivo: 0.5.0_
