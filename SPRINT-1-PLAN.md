# Sprint 1 — Plan de Implementación v0.4.0

> **Estado**: Aprobado — Pendiente de implementación  
> **Fecha**: 2026-04-01  
> **Objetivo**: Limpiar UI para v0, definir sistema de roles, preparar estructura para Sprint 2

---

## Orden de Implementación

| # | Tarea | Archivos | Dependencias |
|---|-------|----------|--------------|
| 1 | Definir Roles (admin vs negocio) | `business-context.tsx`, `mock-businesses.ts` | Ninguna (hacer primero) |
| 2 | Ocultar botón de Notificaciones | `header.tsx` | Ninguna |
| 3 | Ocultar barra de búsqueda | `header.tsx` | Ninguna |
| 4 | Ocultar Tabs no implementadas | `page.tsx` | Ninguna |
| 5 | Ocultar sección Actividad Reciente | `page.tsx` | Acoplado con punto 4 |
| 6 | Sidebar — solo Dashboard | `sidebar.tsx` | Ninguna |
| 7 | Planificación Sprint 2 — Reportes | Solo documentación | Ninguna |

> Los puntos 2, 3 y 6 son independientes entre sí y pueden implementarse en paralelo.  
> Los puntos 4 y 5 modifican el mismo archivo (`page.tsx`) y deben hacerse juntos.

---

## 1. Definir Roles (admin vs negocio)

**Prioridad**: Alta — Cambio fundacional, hacer primero.

### Objetivo

- `admin` → ve todos los negocios (comportamiento actual)
- `negocio` → solo ve sus propias métricas y datos, selector de negocios oculto o con un solo item

### Archivos a modificar

#### `src/contexts/business-context.tsx`

- Agregar tipo `UserRole = "admin" | "negocio"`
- Obtener el email del usuario autenticado desde `auth-context`
- Determinar el rol comparando el email contra el mapeo de roles
- Filtrar el array `businesses` según el rol:
  - Si `admin` → devolver todos los negocios
  - Si `negocio` → devolver solo el negocio asociado al email del usuario
- Exponer `role` en el contexto para que otros componentes puedan condicionar UI

#### `src/lib/data/mock-businesses.ts`

- Agregar mapeo de usuarios a negocios (en v0 puede ser hardcoded):
  ```typescript
  export const userBusinessMap: Record<string, string> = {
    "usuario1@email.com": "tech-solutions",
    "usuario2@email.com": "ecommerce-pro",
  }
  ```
- El admin se identifica via `NEXT_PUBLIC_ADMIN_EMAIL` (ya existe en `.env.local`)

### Consideraciones

- En v0 los roles se manejan con mapeo local. En futuras versiones migrar a tabla `user_roles` en Supabase.
- El selector de negocios en `header.tsx` debe respetar el array filtrado del contexto. Si solo hay 1 negocio, considerar ocultar el selector o mostrarlo deshabilitado.

---

## 2. Ocultar Botón de Notificaciones

**Prioridad**: Baja — Cambio cosmético simple.

### Archivo a modificar

#### `src/components/dashboard/header.tsx`

- Eliminar el `<Button>` que contiene el ícono `<Bell>` (~líneas 79-82)
- Limpiar import: quitar `Bell` de la línea de imports de `lucide-react`

### Notas

- Funcionalidad de notificaciones será implementada en un sprint futuro.
- No se necesita placeholder ni comentario en el código.

---

## 3. Ocultar Barra de Búsqueda

**Prioridad**: Baja — Cambio cosmético simple.

### Archivo a modificar

#### `src/components/dashboard/header.tsx`

- Eliminar el `<form>` con el `<Input>` de búsqueda (~líneas 48-57)
- Limpiar imports: quitar `Search` de `lucide-react` y `Input` de `@/components/ui/input`

### Propuestas de Implementación Futura

#### Propuesta A: Búsqueda Local (Client-Side)

| Aspecto | Detalle |
|---------|---------|
| **Descripción** | Filtrar datos ya cargados en el cliente usando `useMemo` + librería de fuzzy matching |
| **Librería sugerida** | `fuse.js` (~4KB gzipped) |
| **Implementación** | Hook `useSearch(data, query)` que filtra métricas, negocios y actividad en memoria |
| **Ventajas** | Respuesta instantánea, sin llamadas al servidor, fácil de implementar |
| **Desventajas** | Solo busca datos ya en memoria, no escala a grandes volúmenes |
| **Ideal para** | Dashboard con pocos negocios y métricas limitadas |

#### Propuesta B: Búsqueda con Supabase Full-Text Search

| Aspecto | Detalle |
|---------|---------|
| **Descripción** | Usar `textSearch()` de Supabase contra columnas indexadas con PostgreSQL `tsvector` |
| **Implementación** | Server Action que ejecuta `supabase.from('table').textSearch('column', query)` |
| **Requisitos** | Crear índices GIN en las columnas de búsqueda en PostgreSQL |
| **Ventajas** | Escala a grandes volúmenes, búsqueda precisa con ranking, soporte multiidioma |
| **Desventajas** | Requiere configuración en DB, latencia de red por cada búsqueda |
| **Ideal para** | Cuando haya muchos registros en la base de datos |

---

## 4. Ocultar Tabs No Implementadas

**Prioridad**: Media — Hacer junto con punto 5.

### Archivo a modificar

#### `src/app/page.tsx`

- Quitar del `<TabsList>` las tabs "Analíticas" y "Reportes"
- Quitar los `<TabsContent>` correspondientes a "analytics" y "reports"
- **Mantener** la estructura `<Tabs>`, `<TabsList>`, `<TabsContent>` con solo "Resumen"
- La estructura se preserva para facilitar re-agregar tabs en Sprint 2

### Resultado esperado

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Resumen</TabsTrigger>
    {/* Tabs futuras se agregan aquí */}
  </TabsList>
  <TabsContent value="overview">
    {/* Contenido actual de métricas y chart */}
  </TabsContent>
</Tabs>
```

---

## 5. Ocultar Sección de Actividad Reciente

**Prioridad**: Media — Hacer junto con punto 4.

### Archivo a modificar

#### `src/app/page.tsx`

- Eliminar el `<Card>` que contiene `<RecentActivity>` (~líneas 91-101)
- Expandir el chart a ancho completo (cambiar grid de `lg:col-span-4` / `lg:col-span-3` a full width)
- Limpiar imports: quitar `RecentActivity` y los componentes `Card*` si ya no se usan en el archivo

### Notas

- La sección de actividad será rediseñada antes de reintroducirla.
- El componente `recent-activity.tsx` NO se elimina del proyecto, solo se deja de usar en `page.tsx`.

---

## 6. Sidebar — Solo Dashboard

**Prioridad**: Baja — Cambio cosmético simple.

### Archivo a modificar

#### `src/components/dashboard/sidebar.tsx`

- Reducir el array `sidebarNav` a solo el item "Dashboard":
  ```typescript
  const sidebarNav = [
    {
      title: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
  ]
  ```
- Limpiar imports de `lucide-react`: quitar `BarChart3`, `FileText`, `Settings`

### Notas

- Afecta tanto la sidebar desktop como la mobile (ambas usan el mismo array `sidebarNav`).
- No existen rutas `/analytics`, `/reports`, `/settings` como páginas, así que no hay riesgo de acceso directo.

---

## 7. Planificación Sprint 2 — Reportes (Tab)

> **No se implementa código en Sprint 1.** Solo documentación y planificación.

### Objetivo

Agregar una tab "Reportes" al dashboard que permita:
1. Seleccionar un rango de fechas con un calendario
2. Generar un reporte que se muestra en una tabla
3. Exportar el reporte a CSV o Excel

### Estructura de componentes

```
src/components/reports/
  date-range-picker.tsx    — Selector de rango con Calendar de shadcn + Popover
  report-table.tsx         — Tabla con datos del reporte (usa shadcn Table)
  export-button.tsx        — Botón para exportar a CSV/Excel
```

### Integración en `page.tsx`

Se re-agrega la tab "Reportes" al `<TabsList>` existente:

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Resumen</TabsTrigger>
    <TabsTrigger value="reports">Reportes</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    {/* Métricas y chart existentes */}
  </TabsContent>
  <TabsContent value="reports">
    <DateRangePicker onSelect={setDateRange} />
    <ReportTable data={reportData} />
    <ExportButton data={reportData} />
  </TabsContent>
</Tabs>
```

### Dependencias a instalar en Sprint 2

| Paquete | Propósito | Comando |
|---------|-----------|---------|
| `shadcn calendar` | Componente de calendario | `npx shadcn@latest add calendar` |
| `react-day-picker` | Dependencia del calendar (se instala automáticamente) | — |
| `papaparse` | Exportar a CSV | `npm install papaparse` |
| `xlsx` (opcional) | Exportar a Excel | `npm install xlsx` |

### Consideraciones

- El componente `Table` de shadcn ya está disponible en `src/components/ui/table.tsx`
- Para tablas con ordenamiento/filtrado avanzado, considerar `@tanstack/react-table`
- Los datos del reporte vendrán de Supabase (requiere schema de DB definido)
- El rol del usuario debe filtrar los reportes (admin ve todos, negocio ve solo los suyos)

---

## Resumen de Cambios por Archivo

| Archivo | Cambios | Puntos |
|---------|---------|--------|
| `src/contexts/business-context.tsx` | Agregar sistema de roles, filtrar negocios | 1 |
| `src/lib/data/mock-businesses.ts` | Mapeo usuarios → negocios | 1 |
| `src/components/dashboard/header.tsx` | Quitar Bell, quitar Search/Input | 2, 3 |
| `src/app/page.tsx` | Quitar tabs no implementadas, quitar RecentActivity, chart full-width | 4, 5 |
| `src/components/dashboard/sidebar.tsx` | Solo dejar Dashboard en nav | 6 |

---

## Criterios de Aceptación

- [ ] Un usuario admin ve todos los negocios y puede alternar entre ellos
- [ ] Un usuario negocio solo ve su propio negocio y métricas
- [ ] No se muestra botón de notificaciones
- [ ] No se muestra barra de búsqueda
- [ ] Solo se ve la tab "Resumen" en el dashboard
- [ ] No se muestra la sección de actividad reciente
- [ ] El sidebar solo muestra "Dashboard"
- [ ] El chart ocupa el ancho completo sin la sección de actividad
- [ ] La app compila sin errores (`npm run build`)
- [ ] No hay imports sin usar

---

_Fecha de creación: 2026-04-01_  
_Sprint: 1_  
_Versión objetivo: 0.4.0_
