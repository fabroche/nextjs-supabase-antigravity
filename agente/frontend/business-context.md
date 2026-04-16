# Sistema de Roles y Business Context

## Roles

| Rol | Acceso |
|-----|--------|
| `admin` | Ve todos los negocios, selector visible, acceso total en DB vía RLS |
| `negocio` | Ve solo su propio negocio, selector oculto |

Rol en DB: `user_profiles.role`. Determinado por `get_user_role()` RPC en el frontend.  
**`NEXT_PUBLIC_ADMIN_EMAIL`** ya no se usa para determinar el rol — solo la DB.

## BusinessContext (`contexts/business-context.tsx`)

Provider que wraps toda la app en `layout.tsx`. Expone:

```typescript
{
  selectedBusiness: Business | null
  setSelectedBusiness: (b: Business) => void
  businesses: Business[]        // filtrado por rol via RLS automáticamente
  isAdmin: boolean
  isLoading: boolean            // auth + lista de negocios
  isLoadingData: boolean        // métricas del negocio seleccionado
  error: string | null
}
```

**Tipo `Business`** (en `types.ts`) — composite para el frontend:
```typescript
{
  id, name, currency, ownerId
  metrics: { totalRevenue, revenueChange, activeUsers, usersChange, sales, salesChange, activeNow, activeNowChange }
  chartData: Array<{ month, value }>
  recentActivity: Array<{ id, user, email, amount, status }>
}
```

## Business Selector (en `header.tsx`)

- Dropdown `<Select>` — **solo visible cuando `isAdmin === true`**
- Llama `setSelectedBusiness()` → todos los componentes se actualizan
- El `OverviewChart` tiene animación de 500ms en cambio de datos

## Datos de Negocios

Los datos vienen de Supabase real:
- Métricas: vista `business_metrics` (revenue/sales del mes actual vs anterior)
- Snapshots: tabla `business_metrics_snapshot` (active_users, active_now)
- Gráfico: RPC `get_monthly_chart_data(businessId, months)`

## Comportamiento por Rol

Negocio user → `fetchBusinesses()` retorna solo sus negocios (RLS filtra por `owner_id = auth.uid()`).  
Admin → RLS permite ver todos via `is_admin()`.  
El context NO necesita código de filtrado adicional — RLS lo maneja en DB.
