# Patrones UI y Convenciones

## Stack UI

- **shadcn/ui** (new-york style) — componentes en `src/components/ui/`
- **Tailwind CSS v4** — configuración CSS-first en `globals.css` (no `tailwind.config.js`)
- **lucide-react** — iconos
- **Recharts** — gráficos (BarChart, AreaChart)

## Tailwind v4

Warnings de `@theme` y `@apply` en el linter son **esperados** — Tailwind v4 los soporta correctamente. Ignorar.

Variables de tema en `globals.css` usando `@theme inline`:
```css
@import "tailwindcss";
@theme inline {
  --color-background: hsl(var(--background));
  /* ... */
}
```

## shadcn/ui

Agregar nuevos componentes:
```bash
npx shadcn@latest add [component-name]
```

Config en `components.json`: style `new-york`, baseColor `neutral`, cssVariables `true`.

## Patrones React del Proyecto

**Client components** (`"use client"`): solo cuando necesario (hooks, eventos interactivos).  
**Server components** (default): para data fetching inicial, layouts estáticos.

Clases condicionales: siempre `cn()` de `@/lib/utils` (combina clsx + tailwind-merge).

## Componentes Clave Reutilizables

| Componente | Path | Uso |
|-----------|------|-----|
| `MetricCard` | `components/dashboard/metric-card.tsx` | Cards de KPIs con título, valor, cambio %, icono, trend |
| `OverviewChart` | `components/dashboard/overview-chart.tsx` | BarChart Recharts, animado, responsive, theme-aware |
| `DateRangePicker` | `components/reports/date-range-picker.tsx` | Calendario dual-mes (español), presets, popover |
| `Skeleton` | `components/ui/skeleton.tsx` | `animate-pulse rounded-md bg-muted` |
| `DashboardLayout` | `components/dashboard/dashboard-layout.tsx` | Wrapper: Sidebar + Header + main (usar en todas las páginas del dashboard) |

## Sidebar (`components/dashboard/sidebar.tsx`)

- Collapsible: 256px expandido → 64px colapsado
- `sidebarNav` array — agregar items aquí para extender la navegación
- `isActive`: `item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)`  
  (importante: usar `startsWith` para rutas anidadas como `/automatizaciones/*`)
- Mobile: `MobileSidebar` usa Sheet overlay

## Convenciones de Nombres

- Componentes: `PascalCase.tsx`
- Utilities / hooks: `camelCase.ts` / `use-kebab-case.ts`
- Constantes: `UPPER_SNAKE_CASE`

## Reports Tab

- `DateRangePicker` → callback `onDateRangeChange(from, to)`
- `ReportTable` recibe `DbTransaction[]`, muestra summary cards + tabla
- `ExportButton` → CSV via PapaParse (`lib/utils/export.ts`)
- Estado de report se resetea con `useEffect` en `selectedBusiness?.id`
