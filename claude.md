# Project Context & Memory

> **🚨 CRITICAL REMINDER FOR AI AGENTS 🚨**
>
> **ALWAYS UPDATE DOCUMENTATION AFTER IMPLEMENTING A FEATURE!**
>
> After completing ANY feature implementation, bug fix, or architectural change, you MUST:
>
> 1. Update `README.md` with user-facing changes
> 2. Update `claude.md` with technical implementation details
> 3. Update `supabase/migrations/README.md` when adding, modifying, or executing any database migration
> 4. Update the "Last Updated" date at the bottom of all modified docs
>
> **DO NOT SKIP THIS STEP!** Documentation is as important as the code itself.

> **🛠️ ALWAYS USE AGENT SKILLS FOR BEST PRACTICES 🛠️**
>
> This project has installed agent skills in `.agents/skills/`. **You MUST consult the relevant skill before writing or reviewing code:**
>
> | Skill | When to use |
> |-------|-------------|
> | `supabase-postgres-best-practices` | Any SQL query, migration, RLS policy, schema change, or Supabase configuration |
> | `vercel-react-best-practices` | Any React component, hook, server component, data fetching, or performance optimization |
> | `web-design-guidelines` | Any UI layout, accessibility, responsive design, or UX decision |
> | `ui-ux-pro-max` | Color palettes, font pairings, component styling, design system choices |
> | `remotion-best-practices` | Any video generation or Remotion-related work |
>
> **DO NOT write code from memory alone — always reference the skill files to ensure we follow current best practices.**

---

## Project Overview

**Project Name**: Next.js Supabase Dashboard  
**Purpose**: Multi-business metrics dashboard with role-based access and OTP authentication  
**Tech Stack**: Next.js 16, TypeScript, Supabase Auth, shadcn/ui, Tailwind CSS v4  
**Development Status**: v0.8.0 — N8N Automatizaciones pipeline live (Fases 1+2 completadas)  
**Sprint Plans**: `SPRINT-1-PLAN.md` (v0.4.0 - completado), `SPRINT-2-PLAN.md` (v0.6.0 - completado), `SPRINT-3-PLAN.md` (v0.8.0 - EN PROGRESO: Fases 1 y 2 completadas)  
**Next Step**: Sprint 3 Fases 3-7 — Types+Queries, sidebar nav, y 3 niveles de UI `/automatizaciones`

---

## 📝 Documentation Maintenance

> **IMPORTANT**: This file (`claude.md`) serves as the project's memory and context for AI agents. It must be kept in sync with the actual codebase.

### Documentation Update Rules

1. **When adding new features**, update the corresponding sections in both:

   - `README.md` - User-facing documentation (setup, usage, features)
   - `claude.md` - Technical context and architecture

2. **Sections to update in README.md when project grows**:

   - ✨ **Features** - Add new capabilities
   - 📁 **Project Structure** - New directories or important files
   - 🛠️ **Development** - New scripts or workflows
   - 🗄️ **Database Setup** - New tables or schema changes
   - 📚 **Tech Stack** - New dependencies or libraries

3. **Sections to update in claude.md**:

   - **Architecture** - New patterns or technologies
   - **Project Structure** - File organization changes
   - **Dashboard Implementation** - New components or features
   - **Supabase Integration** - Database schema, queries
   - **Next Steps & Roadmap** - Completed items move to "Current Features"
   - **Dependencies Summary** - New packages installed

4. **When modifying database migrations**:

   - Update `supabase/migrations/README.md` with new migration details
   - Add entry to the Execution History table after running a migration
   - Never modify already-executed migration files — create new ones instead

5. **Version Updates**:
   - Update "Last Updated" date at bottom of both files
   - Increment version number when major features are added

### Example Update Flow

When adding a new feature (e.g., User Authentication):

**In README.md**, add to Features:

```markdown
- 🔐 **User Authentication** - Secure login with Supabase Auth
```

**In claude.md**, add to Dashboard Implementation:

```markdown
#### 6. Authentication System

- Login/Signup forms
- Protected routes
- Session management
```

---

## Architecture

### Framework & Core Technologies

- **Next.js 16.1.1** - React framework with App Router
- **React 19.2.3** - UI library
- **TypeScript 5** - Type safety
- **Tailwind CSS v4** - Styling (CSS-first configuration)
- **Supabase** - Backend & Database
  - `@supabase/supabase-js` v2.90.1
  - `@supabase/ssr` v0.8.0

### UI Component Library

**shadcn/ui** - Headless component system built on:

- **Radix UI** - Accessible primitives
- **class-variance-authority** - Component variants
- **clsx** + **tailwind-merge** - Class name utilities
- **lucide-react** - Icon library

---

## Project Structure

```
nextjs-supabase/
├── src/
│   ├── app/
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts      # OAuth callback handler
│   │   ├── login/
│   │   │   └── page.tsx          # Login/Register page
│   │   ├── verify-email/
│   │   │   └── page.tsx          # OTP verification page
│   │   ├── layout.tsx            # Root layout with providers
│   │   ├── page.tsx              # Dashboard home page
│   │   └── globals.css           # Global styles + shadcn theme
│   ├── components/
│   │   ├── dashboard/            # Dashboard-specific components
│   │   │   ├── sidebar.tsx       # Navigation sidebar (collapsible)
│   │   │   ├── header.tsx        # Top bar with business selector
│   │   │   ├── metric-card.tsx   # Reusable metric display
│   │   │   ├── overview-chart.tsx # Animated chart visualization
│   │   │   ├── activity-feed.tsx  # Real-time activity feed
│   │   │   └── recent-activity.tsx # Activity table (legacy, unused)
│   │   ├── notifications/        # Notification system
│   │   │   ├── notification-bell.tsx  # Bell icon with badge in header
│   │   │   └── notification-item.tsx  # Individual notification row
│   │   ├── reports/              # Reports tab components
│   │   │   ├── date-range-picker.tsx # Calendar range picker with presets
│   │   │   ├── report-table.tsx     # Transaction table with summary
│   │   │   └── export-button.tsx    # CSV export dropdown
│   │   ├── theme-provider.tsx    # Theme context provider
│   │   ├── theme-toggle.tsx      # Dark mode toggle
│   │   └── ui/                   # shadcn/ui components
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── form.tsx
│   │       ├── input.tsx
│   │       ├── input-otp.tsx     # OTP input component
│   │       ├── label.tsx
│   │       ├── select.tsx        # Business selector
│   │       ├── separator.tsx
│   │       ├── sheet.tsx
│   │       ├── table.tsx
│   │       └── tabs.tsx
│   ├── hooks/
│   │   ├── use-activity-feed.ts   # Supabase Realtime hook for activity feed
│   │   └── use-notifications.ts   # Supabase Realtime hook for notifications
│   ├── contexts/
│   │   ├── auth-context.tsx    # Centralized authentication state
│   │   └── business-context.tsx  # Business state management
│   ├── lib/
│   │   ├── auth/
│   │   │   └── actions.ts        # Server actions for authentication
│   │   ├── supabase/
│   │   │   ├── admin.ts          # Service role client (backend only)
│   │   │   ├── client.ts         # Client-side Supabase client
│   │   │   ├── server.ts         # Server-side Supabase client
│   │   │   ├── middleware.ts     # Session management
│   │   │   ├── types.ts          # TypeScript interfaces for DB tables/views
│   │   │   └── queries.ts        # Supabase query functions
│   │   ├── utils/
│   │   │   └── export.ts          # CSV export utility (PapaParse)
│   │   └── utils.ts              # cn() utility for class merging
│   ├── app/
│   │   └── api/
│   │       └── webhooks/
│   │           ├── [source]/
│   │           │   └── route.ts      # Dynamic webhook endpoint
│   │           └── _lib/
│   │               ├── types.ts      # NormalizedEvent interface
│   │               ├── validators.ts # HMAC signature validation
│   │               └── normalizers.ts # Payload normalizers per source
│   └── middleware.ts             # Route protection middleware
├── public/
│   └── assets/
│       └── login-cover.png       # Login page cover image
├── supabase/
│   └── migrations/
│       ├── 001_foundation.sql         # Functions, user_profiles, triggers
│       ├── 002_business_data.sql      # businesses, transactions, snapshots
│       ├── 003_views_and_functions.sql # Views and RPC functions
│       ├── 004_seed_data.sql          # Initial seed data
│       ├── 005_notifications.sql      # activity_feed, notifications, Realtime
│       ├── 006_webhook_infrastructure.sql # webhook_sources, dead_letters
│       ├── 007_activity_severity.sql  # severity column en activity_feed
│       └── 008_automatizaciones_schema.sql # n8n_instances, workflows, executions, model_pricing, custom_metrics
├── components.json               # shadcn/ui configuration
├── tsconfig.json                 # TypeScript configuration
├── .env.local                    # Environment variables (gitignored)
├── package.json                  # Dependencies
├── BRANCHING-STRATEGY.md        # Reusable branching & commit convention
├── SPRINT-1-PLAN.md             # Sprint 1 implementation plan (v0.4.0)
├── SPRINT-2-PLAN.md             # Sprint 2 implementation plan (v0.5.0)
├── SPRINT-2-IMPLEMENTATION.md   # Sprint 2 step-by-step implementation guide
├── SPRINT-3-PLAN.md             # Sprint 3 plan — N8N Automatizaciones Analytics (EN PROGRESO)
└── SPRINT-4-PLAN.md             # Sprint 4 plan — ticket system
```

---

## Configuration Files

### components.json (shadcn/ui)

```json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### tsconfig.json Path Aliases

```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@/components/*": ["./src/components/*"],
    "@/lib/*": ["./src/lib/*"],
    "@/hooks/*": ["./src/hooks/*"]
  }
}
```

---

## Environment Variables

Required in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ADMIN_EMAIL=admin@example.com
SERVICE_ROLE_KEY=your-service-role-key          # Backend only — never expose to client
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret     # Also stored in webhook_sources table
```

**Current Setup**: Self-hosted Supabase instance at `https://supabase.genzai.cloud`

### Dokploy Infrastructure

**Hosting**: Hostinger VPS with Dokploy managing the Supabase stack

**Key paths on server**:
- **Kong config**: `/etc/dokploy/compose/supabase-supabase-zovmga/files/volumes/api/kong.yml`
- **Stack prefix**: `supabase-supabase-zovmga-` (Dokploy-generated, prepended to all container names)

**Dokploy + Supabase gotcha (resolved 2026-04-09)**:

Dokploy renames containers with its stack prefix, breaking Kong's hardcoded upstream hostnames. Two fixes applied to `kong.yml`:

1. **Upstream hostname**: Changed `realtime-dev.supabase-realtime` → `realtime` (Docker Compose network alias, stable across renames)
2. **Host header for multi-tenant Realtime**: Supabase Realtime v2 uses the `Host` header as tenant lookup key. The tenant in `_realtime.tenants` is called `realtime-dev`, but Kong was sending `Host: realtime`. Fix: added `request-transformer` plugin to replace `Host` → `realtime-dev` on both Realtime services (ws + rest)

```yaml
# Added to both realtime-v1-ws and realtime-v1-rest services in kong.yml
plugins:
  - name: request-transformer
    config:
      replace:
        headers:
          - host:realtime-dev
```

**Important notes**:
- Use `docker restart` for Kong, NOT `kong reload` — Kong's entrypoint runs `envsubst` on `temp.yml` → `kong.yml` at boot; reload doesn't re-process the template
- `SEED_SELF_HOST=true` on the Realtime container overwrites `_realtime.tenants.jwt_secret` on every restart — don't try to fix tenant config directly in the DB
- All services share the same JWT secret across the stack

---

## Dashboard Implementation

### Current Features

#### 1. Layout System

- **Sidebar Navigation** (Desktop)
  - Collapsible: 256px expanded → 64px collapsed
  - Navigation items: Dashboard only (Analytics, Reports, Settings hidden for v0)
  - Active state highlighting
  - Smooth transitions
- **Mobile Sidebar**
  - Sheet overlay triggered by hamburger menu
  - Same nav items as desktop (Dashboard only)

#### 2. Header Component

- Business selector (admin only — see Role System below)
- Theme toggle (dark/light mode)
- User dropdown menu:
  - Profile information
  - Settings link
  - Logout option
- **Hidden for v0**: Search bar, notification bell (planned for future sprints)

#### 3. Metric Cards

Four key metrics displayed:

- **Ingresos Totales**: $45,231.89 (+20.1%)
- **Usuarios Activos**: +2,350 (+180.1%)
- **Ventas**: +12,234 (+19%)
- **Activos Ahora**: +573 (+201)

Features:

- Icon representation
- Trend indicators (color-coded)
- Percentage changes

#### 4. Data Visualization

- **Overview Chart**: Simple bar chart (6 months), full-width layout
  - Placeholder for advanced charting library (Recharts recommended)
- **Recent Activity**: Hidden for v0 (component exists at `recent-activity.tsx` but unused, pending redesign)

#### 5. Tab Navigation

- Resumen/Overview (default, only visible tab)
- Analytics and Reports tabs hidden for v0 (structure preserved in code for Sprint 2)

#### 6. Authentication System

**OTP Email Verification** (`app/verify-email/page.tsx`):

- 6-digit OTP input using shadcn input-otp component
- Automatic verification when code is complete
- Resend code functionality
- Success state with auto-redirect to login
- Error handling for invalid codes

**Login/Register Page** (`app/login/page.tsx`):

- Dual-mode form (toggle between login and sign-up)
- Email and password validation
- Error handling and display
- Loading states during authentication
- Split-screen design with analytics cover image
- "Forgot password" link
- Success message display after email verification

**Auth Callback Handler** (`app/auth/callback/route.ts`):

- Handles OAuth callbacks (if needed in future)
- Currently used for email link verification fallback

**Server Actions** (`lib/auth/actions.ts`):

- `signIn(formData)` - Email/password authentication
- `signUp(formData)` - User registration with OTP
- `signOut()` - Session termination
- `getUser()` - Current user retrieval

**Protected Routes** (`middleware.ts` + `lib/supabase/middleware.ts`):

- Redirects unauthenticated users to `/login`
- Allows access to `/verify-email` and `/auth/callback` without auth
- Prevents logged-in users from accessing `/login`
- Maintains session cookies across requests
- Protects all routes except static assets

**User Menu** (in `header.tsx`):

- Displays user email in dropdown
- Avatar with email initial fallback
- Profile and Settings options
- Logout functionality

**Authentication Flow**:

1. User visits protected route → Middleware checks session
2. If not authenticated → Redirect to `/login`
3. New user registers → Supabase sends OTP code via email
4. User redirected to `/verify-email` page
5. User enters 6-digit OTP → System verifies with Supabase
6. If valid → Email verified → Redirect to login with success message
7. User logs in → Create session → Redirect to dashboard
8. Session persists across page refreshes
9. Logout → Clear session → Redirect to `/login`

**Security Features**:

- Server-side authentication
- HTTP-only cookies for session management
- OTP codes expire after 60 minutes
- Password hashing by Supabase
- CSRF protection via Next.js

#### 7. Business Context & Role System

**Role System** (Sprint 1 - v0.4.0):

- Two roles: `admin` and `negocio`
- **admin**: Identified by `NEXT_PUBLIC_ADMIN_EMAIL` env var. Can see all businesses and switch between them via the header selector.
- **negocio**: Any other authenticated user. Can only see their own business (filtered by `ownerEmail` match). Business selector is hidden.
- Role determination happens in `business-context.tsx` using `isAdminUser()` from `mock-businesses.ts`
- The `businesses` array exposed by the context is **filtered by role** — negocio users never receive other businesses' data in the client
- **Important**: When migrating to Supabase real data, role filtering must also be enforced server-side (RLS policies), not just client-side

**Business Context** (`contexts/business-context.tsx`):

- React Context for sharing selected business across components
- Provides `selectedBusiness`, `setSelectedBusiness`, `businesses` (filtered by role), `isAdmin`, `isLoading`
- `filteredBusinesses` computed via `useMemo` based on `isAdmin` and `user.email`
- Wraps entire app in `layout.tsx`

**Mock Business Data** (`lib/data/mock-businesses.ts`):

- Three sample businesses with complete metrics:
  - Tech Solutions Inc. (owner: `kraxusmmo@gmail.com`)
  - E-Commerce Pro (owner: `user2@example.com`)
  - Marketing Agency (owner: `user3@example.com`)
- Each business includes:
  - `ownerEmail` — used for role-based filtering
  - Unique metrics (revenue, users, sales, active now)
  - 6 months of chart data with varied values
  - 5 recent activity transactions
  - Status indicators (success, pending, failed)
- Helper functions: `getBusinessByOwner(email)`, `isAdminUser(email)`

**Business Selector** (in `header.tsx`):

- Select dropdown — **only visible for admin users**
- Displays only businesses available to the user's role
- Updates context when selection changes
- Triggers automatic dashboard updates

**Dynamic Dashboard Updates**:

- Metric cards update with selected business data
- Chart animates smoothly between business data (500ms transition)
- All changes happen instantly when business is selected

#### 8. Reports Tab (Sprint 2 - v0.6.0)

**Date Range Picker** (`components/reports/date-range-picker.tsx`):
- Dual-month calendar with `react-day-picker` in Spanish locale
- Quick presets: last week, last month, last 3 months
- Popover UI with "Aplicar" button to confirm selection
- Dates cannot exceed today

**Report Table** (`components/reports/report-table.tsx`):
- Summary cards: total amount, transaction count, completed, pending/failed
- Full transaction table: date, concept, category, client, amount, status
- Status badges with color variants (default/secondary/destructive)
- Loading and empty states

**Export Button** (`components/reports/export-button.tsx`):
- Dropdown with CSV export option (extensible for future formats)
- Disabled when no data or no date range selected
- Filename format: `reporte-{business}-{from}-{to}.csv`

**CSV Export Utility** (`lib/utils/export.ts`):
- Uses PapaParse to generate CSV from `DbTransaction[]`
- Columns: Fecha, Concepto, Categoria, Monto, Estado, Cliente, Email
- Browser download via Blob + object URL

**Query** (`lib/supabase/queries.ts`):
- `fetchTransactionsByDateRange(businessId, from, to)` — filters by `created_at` range, ordered descending

**Integration** (`app/page.tsx`):
- "Reportes" tab added alongside "Resumen"
- Report state resets when selected business changes (`useEffect` on `selectedBusiness.id`)

#### 9. Real-time Notifications & Webhooks (Sprint 3 - v0.7.0)

**Webhook Endpoint** (`app/api/webhooks/[source]/route.ts`):
- Dynamic route accepting POST from any configured source
- Validates signature via `validators.ts` (HMAC for Dokploy/Notion, direct comparison for Telegram/N8N)
- Fire-and-forget: responds 200 immediately, processes in background
- Failed webhooks saved to `webhook_dead_letters` table

**Normalizers** (`app/api/webhooks/_lib/normalizers.ts`):
- Telegram: handles `message.new` and `message.reply` events
- Resolves `telegram_id` → Supabase `user_id` for personal notifications
- Stubs ready for Dokploy, Notion, N8N

**Realtime Hooks** (`hooks/`):
- `useActivityFeed` — subscribes to `activity_feed` table INSERTs via Supabase Realtime
- `useNotifications` — subscribes to user-filtered `notifications` INSERTs, manages unread count

**NotificationBell** (`components/notifications/notification-bell.tsx`):
- Bell icon with red unread badge (shows count, max "9+")
- Dropdown with notification list, "mark all as read" action
- Each item shows source icon, description, relative time

**ActivityFeed** (`components/dashboard/activity-feed.tsx`):
- Live feed of all webhook events in the dashboard
- Connection status indicator (Wifi icon: green = connected)
- Source icons per platform

#### 10. Animated Chart Component

**Overview Chart** (`components/dashboard/overview-chart.tsx`):

- Pixel-based height calculations for proper CSS transitions
- 500ms smooth animation when data changes
- Responsive bar chart with 6 months of data
- Hover effects on bars
- Dynamic scaling based on max value
- Ready for Recharts integration

---

## Styling System

### Tailwind CSS v4 Configuration

Using CSS-first approach in `globals.css`:

```css
@import "tailwindcss";

@layer base {
  :root {
    /* Light mode variables */
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    /* ... more variables */
  }

  .dark {
    /* Dark mode variables */
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    /* ... more variables */
  }
}

@theme inline {
  /* Map CSS variables to Tailwind */
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  /* ... more mappings */
}
```

### Theme Variables

- Background, foreground, card, popover
- Primary, secondary, muted, accent
- Destructive (for errors/warnings)
- Border, input, ring
- Chart colors (1-5)

---

## Supabase Integration

### Client Setup

**Client-side** (`lib/supabase/client.ts`):

```typescript
import { createBrowserClient } from "@supabase/ssr";
```

**Server-side** (`lib/supabase/server.ts`):

```typescript
import { createServerClient } from "@supabase/ssr";
```

**Middleware** (`lib/supabase/middleware.ts`):

- Session management utilities

### Database Schema

**Tables** (defined in `supabase/migrations/`):

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `user_profiles` | User roles, linked 1:1 to `auth.users` | `id` (FK), `role` ('admin'/'negocio'), `full_name` |
| `businesses` | Business entities (1 user = N businesses) | `id`, `owner_id` (FK), `name`, `currency` |
| `transactions` | Financial transactions — all metrics derived from this | `id`, `business_id` (FK), `customer_name`, `customer_email`, `amount`, `status`, `concept`, `category` |
| `business_metrics_snapshot` | Daily snapshots for active users | `id`, `business_id` (FK), `active_users`, `active_now`, `snapshot_date` |
| `activity_feed` | All webhook events from external sources | `id`, `source`, `event_type`, `actor`, `action`, `description`, `channel`, `severity`, `business_id` (nullable FK) |
| `notifications` | Personal notifications per user | `id`, `user_id` (FK), `source`, `action`, `description`, `read`, `read_at` |
| `webhook_sources` | Webhook source config and secrets | `id`, `source`, `secret`, `is_active`, `config` |
| `webhook_dead_letters` | Failed webhook processing queue | `id`, `source`, `payload`, `error`, `retries`, `resolved` |
| `n8n_instances` | Registered N8N instances per business | `id`, `business_id` (FK), `instance_id` (external), `name`, `environment`, `api_base_url`, `api_key` |
| `n8n_workflows` | Auto-created on first webhook per workflow | `id`, `instance_id` (FK), `workflow_id`, `name`, `is_active`, `last_seen_at` |
| `n8n_executions` | Each N8N workflow execution with tokens+cost | `id`, `instance_id`, `workflow_id`, `execution_id` (UNIQUE), `status`, `tokens_prompt`, `tokens_completion`, `model_name`, `cost_usd`, `is_enriched` |
| `model_pricing` | LLM cost per 1k tokens | `model_name`, `cost_per_1k_prompt`, `cost_per_1k_completion`, `is_active` |
| `custom_metrics` | Arbitrary KPIs per business | `id`, `business_id`, `instance_id`, `metric_key`, `metric_value`, `recorded_at` |

**Views**:
- `business_metrics` — Aggregates `transactions` for revenue/sales metrics per business
- `n8n_instance_stats` — Aggregated execution metrics per instance (total, success, error, cost, avg duration)
- `n8n_workflow_stats` — Aggregated execution metrics per workflow

**Functions**:
- `is_admin()` — SECURITY DEFINER helper used in all RLS policies
- `get_user_role()` — RPC to get authenticated user's role
- `get_monthly_chart_data(business_id, months)` — RPC for chart data (monthly revenue)
- `get_execution_trend(p_instance_id, p_days)` — RPC for execution trend over time (grouped by day)

**Triggers**:
- `handle_new_user` — Auto-creates `user_profiles` row on signup with `role = 'negocio'`
- `update_updated_at` — Auto-updates `updated_at` on `user_profiles`, `businesses`, `n8n_instances`, `n8n_workflows`

**RLS Pattern**: All tables have RLS enabled. Negocio users access only their own data (via `owner_id` or `business_id` chain). Admin users access everything via `is_admin()`.

**Realtime**: `activity_feed` and `notifications` tables are added to `supabase_realtime` publication for live updates. ✅ Verified working end-to-end in production (2026-04-09).

**Indexes**: Composite index on `transactions(business_id, status, created_at DESC)` covers the main metrics/chart queries. Partial index on `notifications(user_id, read) WHERE read = false` for unread count.

### Migration Files

```
supabase/migrations/
├── 001_foundation.sql           # is_admin(), user_profiles, handle_new_user trigger
├── 002_business_data.sql        # businesses, transactions, snapshots + RLS + indexes
├── 003_views_and_functions.sql  # business_metrics view, RPC functions
├── 004_seed_data.sql            # Admin promotion, 3 businesses, transactions, snapshots
├── 005_notifications.sql        # activity_feed, notifications, Realtime
├── 006_webhook_infrastructure.sql # webhook_sources, dead_letters
├── 007_activity_severity.sql    # severity column en activity_feed
└── 008_automatizaciones_schema.sql # n8n tables, views, RPC, model_pricing seed
```

### Current Status

- ✅ Supabase clients configured
- ✅ Environment variables set up
- ✅ Authentication system implemented
- ✅ Protected routes configured
- ✅ User session management active
- ✅ Database schema: 8 tables core + 5 tablas N8N + 3 vistas + 4 functions + 2 triggers
- ✅ RLS policies defined for all tables
- ✅ Migrations 001–008 ejecutadas en producción
- ✅ Frontend connected to real Supabase data
- ✅ Realtime WebSocket working in production (2026-04-09)
- ✅ N8N webhook pipeline funcionando en producción (2026-04-12)
- ✅ Enrichment con `gpt-4.1-mini` verificado en producción (2026-04-15) — tokens y costo aparecen en dashboard

---

## N8N Automatizaciones Pipeline

### Arquitectura del Pipeline

```
Webhook N8N
  → POST /api/webhooks/n8n
  → normalizeN8N()
  → processN8NExecution()
      ├─ insert n8n_executions
      ├─ insert activity_feed (con metadata.enrichment_pending=true)
      └─ enrichExecution() [fire-and-forget]
            ├─ fetch N8N API /executions/{id}?includeData=true
            ├─ extract tokens + model from ai_languageModel channel
            ├─ calculateCost() via model_pricing
            ├─ update n8n_executions (tokens, cost, is_enriched=true)
            └─ update activity_feed (append cost suffix + clear pending flag)
                  → Realtime broadcasts UPDATE → dashboard merges in place
```

### Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `src/app/api/webhooks/[source]/route.ts` | Entry point + `processN8NExecution()` + `enrichExecution()` + `clearActivityFeedPending()` |
| `src/lib/n8n/enrichment.ts` | Cliente API N8N — extrae tokens/modelo del canal `ai_languageModel` |
| `src/lib/n8n/cost-calculator.ts` | Calcula costo usando `model_pricing` (cache in-memory 5min) |
| `src/app/api/webhooks/_lib/normalizers.ts` | `normalizeN8N()` — construye `NormalizedEvent` |
| `src/app/api/webhooks/_lib/types.ts` | `NormalizedEvent` con `business_id` opcional |
| `src/hooks/use-activity-feed.ts` | Realtime hook — escucha INSERT + UPDATE para merge in-place |
| `src/components/dashboard/activity-feed.tsx` | UI con skeleton + "Calculando costo…" mientras `enrichment_pending=true` |
| `src/components/ui/skeleton.tsx` | Primitive shadcn Skeleton |

### Flujo Detallado

1. **Recepción**: Webhook validado con `x-n8n-webhook-secret` via `webhook_sources` tabla
2. **Normalización**: `normalizeN8N()` extrae `instance_id`, `workflow_id`, `execution_id`, `status`, tokens del payload
3. **Lookup instancia**: Busca `n8n_instances` por `instance_id` → obtiene `business_id` y credenciales API
4. **Upsert workflow**: `n8n_workflows` se crea automáticamente en primer webhook
5. **Insert execution**: `n8n_executions` con UNIQUE constraint en `(instance_id, execution_id)` — duplicados silenciados
6. **Marcar pending**: Si la instancia tiene `api_key` y `status=success`, se agrega `metadata.enrichment_pending=true` al evento antes del insert
7. **Activity feed insert**: `business_id` vinculado (visible solo al business owner). El dashboard recibe el INSERT via Realtime y renderiza con skeleton si `enrichment_pending=true`
8. **Enrichment async** (fire-and-forget): llama a N8N API `GET /api/v1/executions/{id}?includeData=true` con **polling** — N8N dispara el webhook antes de que el workflow termine (los AI nodes siguen ejecutando), por eso se hace polling con intervalos de 4s hasta que `data.finished === true` (máx 5 reintentos, ~60s ventana). Luego extrae tokens del canal `ai_languageModel`, calcula costo
9. **Update final** (siempre, success o fail — try/finally): update `n8n_executions` con tokens+cost, update `activity_feed.description` con sufijo `(X tokens, $Y.YYYY)` y `metadata.enrichment_pending=false`. El dashboard merge el UPDATE in-place → skeleton desaparece, aparece el costo real

### Extracción de Tokens (Estructura Real de N8N)

Los tokens NO están en `data.main` sino en el canal `data.ai_languageModel`:
```
runData["Modelo OpenAI1"][0].data.ai_languageModel[0][0].json.tokenUsage = {
  completionTokens: 20,
  promptTokens: 641,
  totalTokens: 661
}
```
El modelo está en `inputOverride.ai_languageModel[0][0].json.options.model = "gpt-4.1-mini"`.

**Nota estructural**: son 2 niveles de array (`[0][0]`) terminando en un objeto con `.json`, no 3. Cualquier loop adicional rompe la extracción.

### Requisito crítico: `REPLICA IDENTITY FULL`

Supabase Realtime requiere `REPLICA IDENTITY FULL` en tablas con RLS para emitir eventos UPDATE — sin eso, los UPDATEs se descartan silenciosamente en el broadcast (los INSERTs funcionan bien igual). La migración **009_activity_feed_replica_identity.sql** aplica esto a `activity_feed` + `notifications`. Sin esta migración, el skeleton se queda colgado hasta que el usuario recargue la página.

### Setup de Instancia N8N

```sql
-- Registrar una instancia (una sola vez por instancia de N8N)
INSERT INTO n8n_instances (business_id, instance_id, name, environment, api_base_url, api_key)
VALUES (
  'UUID-DEL-BUSINESS',
  'genzai-prod',              -- identificador arbitrario enviado en el webhook
  'Genzai Producción',
  'production',
  'https://n8n.genzai.cloud',
  'API-KEY-DE-N8N'            -- Settings > API en N8N
);
```

### Escape timer del frontend

El skeleton tiene un timer de escape de **15 segundos** por evento. Si el UPDATE del enrichment nunca llega (silent Realtime drop, bug en backend, timeout del fetch a N8N API), el skeleton desaparece solo para evitar estados colgados. Implementado en `useEnrichmentEscape()` dentro de `activity-feed.tsx`.

### 🔮 Cambio futuro planeado: tokens directo en el payload de N8N

El colaborador del lado N8N está trabajando en un **Code node** que extraerá `tokenUsage` del sub-nodo del modelo y lo inyectará directamente en el payload del HTTP Request. Cuando los workflows se migren a esa versión, el pipeline se simplificará significativamente:

- `normalizeN8N()` ya lee `tokens_prompt`/`tokens_completion`/`cost_usd` del payload — no requiere cambio
- `processN8NExecution()` debe chequear `if (tokensPrompt > 0)` → path directo sin enrichment
- Los workflows legacy siguen funcionando por el path actual (fallback automático, sin breaking change)
- Una vez que todos los workflows estén migrados, se puede eliminar `fetchN8NExecutionDetail`, `enrichExecution`, el flag `enrichment_pending`, y el skeleton UI
- Recomendable mantener el UPDATE listener en `useActivityFeed` como primitiva defensiva para otras fuentes futuras

**Beneficio a escala** (500+ msg/min): elimina 1 HTTP call a N8N API + 2 SELECT + 2 UPDATE por mensaje → ~5x menos I/O.



---

## Development Workflow

### Commands

```bash
npm run dev      # Start development server (port 3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Adding shadcn/ui Components

```bash
npx shadcn@latest add [component-name]
```

Examples:

```bash
npx shadcn@latest add form
npx shadcn@latest add dialog
npx shadcn@latest add select
```

---

## Next Steps & Roadmap

### Immediate Priorities

1. **Register Telegram webhook + end-to-end test** (next up)
   - Deploy to Dokploy with env vars (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`)
   - Run `curl` to register webhook with BotFather (command ready in previous session)
   - Send message to bot → verify it appears in activity feed + notifications
2. **Sprint 3 — Remaining phases**
   - Add normalizers for Dokploy, Notion, N8N (Fase 4)
   - Settings panel for users to link telegram_id / notion_person_id (Fase 5)
   - Dead letter admin view (Fase 5)

### Completed Features

- ✅ **Authentication** (Completed)

  - Supabase Auth integration
  - Protected routes with middleware
  - User session management
  - Login/Register page
  - User menu with logout

- ✅ **OTP Email Verification** (Completed)

  - 6-digit OTP input component
  - Email verification flow
  - Resend code functionality
  - Success/error states
  - Auto-redirect after verification

- ✅ **Business Selector** (Completed)

  - Business context provider
  - Mock business data (3 businesses)
  - Select dropdown in header (admin only)
  - Dynamic metric updates
  - Animated chart transitions
  - Per-business activity data

- ✅ **Role-Based Access** (Sprint 1 - v0.4.0)

  - Admin vs negocio roles
  - Businesses array filtered by role in context
  - Business selector hidden for non-admin users
  - Role determined by admin email env var

- ✅ **v0 UI Cleanup** (Sprint 1 - v0.4.0)
  - Notification bell hidden (future feature)
  - Search bar hidden (future feature — 2 proposals documented in SPRINT-1-PLAN.md)
  - Sidebar reduced to Dashboard only
  - Tabs reduced to Resumen only
  - Recent activity section hidden (pending redesign)
  - Chart expanded to full width

- ✅ **Advanced Charting** (v0.5.0)
  - Recharts integrated (`npm install recharts`)
  - `OverviewChart` rewritten with `<BarChart>`, `<XAxis>`, `<YAxis>`, `<Tooltip>`
  - Responsive container, theme-aware tooltip, currency formatting on Y axis
  - Zero changes needed in queries, context, or page.tsx (plug and play)

- ✅ **Database Schema** (v0.4.1)
  - 4 tables: `user_profiles`, `businesses`, `transactions`, `business_metrics_snapshot`
  - `business_metrics` view for derived revenue/sales metrics
  - RPC functions: `get_monthly_chart_data`, `get_user_role`
  - RLS policies on all tables (admin sees all, negocio sees own data)
  - Auto-profile creation trigger on signup
  - Seed data matching current mock businesses
  - Migration files in `supabase/migrations/`

### Sprint 3 — Completed (v0.7.0 — Fases 1-3)

- ✅ **Real-time Notifications** (Sprint 3)
  - Webhook endpoint `/api/webhooks/[source]` with HMAC validation
  - Telegram normalizer (message.new, message.reply)
  - Fire-and-forget processing with dead letter queue
  - Supabase Realtime hooks (`useActivityFeed`, `useNotifications`)
  - NotificationBell in header with unread badge
  - ActivityFeed component in dashboard (live Realtime connection indicator)
  - Mark as read / mark all as read
  - 2 new migrations: `005_notifications.sql`, `006_webhook_infrastructure.sql`
  - 6 new tables: `activity_feed`, `notifications`, `webhook_sources`, `webhook_dead_letters`
  - `user_profiles` extended with `telegram_id`, `notion_person_id`
  - Service role admin client (`lib/supabase/admin.ts`)

### Sprint 2 — Completed (v0.6.0)

- ✅ **Reports Tab** (Sprint 2)
  - Date range picker with calendar (dual month, Spanish locale) and quick presets
  - Transaction report table with summary cards (total, count, completed, pending/failed)
  - CSV export via PapaParse (filename includes business name + date range)
  - "Reportes" tab re-enabled alongside "Resumen"
  - Report state resets when switching businesses
  - New query: `fetchTransactionsByDateRange()` in `queries.ts`
  - New components: `date-range-picker.tsx`, `report-table.tsx`, `export-button.tsx`
  - New utility: `lib/utils/export.ts`
  - Dependencies added: shadcn calendar, popover, papaparse, date-fns, react-day-picker

### Future Sprints (Backlog)

- **Real-time Updates**: Supabase subscriptions
- **Search**: Client-side (fuse.js) or Supabase full-text search (see proposals in SPRINT-1-PLAN.md)
- **Notifications**: Real-time notification system
- **Analytics Page**: Detailed analytics views
- **Settings Page**: User preferences, team management
- **Mobile Optimization**: Enhanced mobile experience

---

## Important Notes

### Tailwind CSS v4 Warnings

The CSS linter may show warnings for `@theme` and `@apply` directives. These are **expected** and work correctly with Tailwind v4. Safe to ignore.

### Component Patterns

**Server Components** (default):

```typescript
// src/app/page.tsx
export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from("table").select();
  return <div>{/* ... */}</div>;
}
```

**Client Components** (interactive):

```typescript
"use client";
// For useState, useEffect, event handlers, etc.
```

### Data Fetching Strategy

- Use Server Components for initial data
- Use Client Components for interactive features
- Consider React Server Actions for mutations

---

## Known Issues & Considerations

1. ~~**Chart Library**~~: Recharts integrated (v0.5.0). Consider adding more chart types (line, area) in future sprints.
2. **Avatar Images**: Placeholder paths (`/avatars/01.png`) need real images or dynamic generation.
3. **Role Security**: Frontend uses `get_user_role()` RPC + RLS policies in DB. `NEXT_PUBLIC_ADMIN_EMAIL` env var is no longer used for role determination.
5. **Test Metrics**: Current seed data (businesses, transactions, snapshots) is for testing only. Production will use different metrics and data structures.
5. **Error Handling**: Add error boundaries and loading states.
6. **Accessibility**: Ensure ARIA labels and keyboard navigation.
7. **Hidden Features**: Notifications, search, activity, extra tabs, and sidebar nav items are hidden (not deleted) for v0. Components still exist in codebase.

---

## Code Conventions

### Naming

- Components: PascalCase (`MetricCard.tsx`)
- Utilities: camelCase (`utils.ts`)
- Constants: UPPER_SNAKE_CASE

### File Organization

- Group related components in directories
- Keep components small and focused
- Extract reusable logic to hooks

### Styling

- Use Tailwind utility classes
- Use `cn()` for conditional classes
- Follow shadcn/ui patterns

---

## Dependencies Summary

### Production

- Next.js, React, TypeScript
- Supabase (client + SSR)
- shadcn/ui components (Radix UI)
- Tailwind CSS v4
- Lucide icons
- Recharts (data visualization)
- PapaParse (CSV export)
- date-fns (date formatting)
- react-day-picker (calendar component)

### Development

- ESLint
- TypeScript types
- Tailwind PostCSS plugin

---

## Quick Reference

### Vercel Documentation

For deployment and Vercel-specific features, consult the official documentation:

- **LLM-optimized docs**: https://vercel.com/docs/llms-full.txt

### Adding a New Metric Card

```typescript
<MetricCard
  title="Your Metric"
  value="123"
  change="+10% from last month"
  changeType="positive"
  icon={YourIcon}
/>
```

### Fetching Data from Supabase

```typescript
const supabase = await createClient();
const { data, error } = await supabase.from("your_table").select("*").limit(10);
```

### Using Theme Colors

```typescript
className = "bg-primary text-primary-foreground";
className = "bg-secondary text-secondary-foreground";
className = "bg-destructive text-destructive-foreground";
```

---

## Project Goals

**Primary Objective**: Create a comprehensive metrics dashboard for monitoring project performance and analytics.

**Key Requirements**:

- Real-time or near-real-time data updates
- Clean, professional UI
- Mobile-responsive design
- Easy to extend with new metrics
- Integration with Supabase backend

**Success Criteria**:

- Dashboard loads quickly (<2s)
- Data updates reliably
- Intuitive navigation
- Accessible on all devices
- Scalable architecture

---

_Last Updated: 2026-04-15_  
_Version: 0.8.2_  
_Status: v0.8.2 — N8N enrichment completamente verificado en producción. Root cause resuelto: N8N dispara el webhook mid-execution (antes de que los AI nodes terminen), fix con polling hasta `finished=true` (4s × 5 reintentos). Sprint 3 Fase 3 completada (types + queries). Próximo: Fases 4-7 (sidebar nav, UI `/automatizaciones`). Cambio futuro planeado: tokens directo en payload de N8N (Code node en desarrollo)._
