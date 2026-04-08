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
**Development Status**: v0.6.0 — Reports tab live, DB connected, Recharts integrated  
**Sprint Plans**: `SPRINT-1-PLAN.md` (v0.4.0 - completed), `SPRINT-2-PLAN.md` (v0.6.0 - completed), `SPRINT-3-PLAN.md` (pending)  
**Next Step**: Sprint 3 — Real-time notifications with Supabase subscriptions

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
│   │   │   └── recent-activity.tsx # Activity table
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
│   ├── contexts/
│   │   ├── auth-context.tsx    # Centralized authentication state
│   │   └── business-context.tsx  # Business state management
│   ├── lib/
│   │   ├── auth/
│   │   │   └── actions.ts        # Server actions for authentication
│   │   ├── supabase/
│   │   │   ├── client.ts         # Client-side Supabase client
│   │   │   ├── server.ts         # Server-side Supabase client
│   │   │   ├── middleware.ts     # Session management
│   │   │   ├── types.ts          # TypeScript interfaces for DB tables/views
│   │   │   └── queries.ts        # Supabase query functions
│   │   ├── utils/
│   │   │   └── export.ts          # CSV export utility (PapaParse)
│   │   └── utils.ts              # cn() utility for class merging
│   └── middleware.ts             # Route protection middleware
├── public/
│   └── assets/
│       └── login-cover.png       # Login page cover image
├── supabase/
│   └── migrations/
│       ├── 001_foundation.sql         # Functions, user_profiles, triggers
│       ├── 002_business_data.sql      # businesses, transactions, snapshots
│       ├── 003_views_and_functions.sql # Views and RPC functions
│       └── 004_seed_data.sql          # Initial seed data
├── components.json               # shadcn/ui configuration
├── tsconfig.json                 # TypeScript configuration
├── .env.local                    # Environment variables (gitignored)
├── package.json                  # Dependencies
├── BRANCHING-STRATEGY.md        # Reusable branching & commit convention
├── SPRINT-1-PLAN.md             # Sprint 1 implementation plan (v0.4.0)
├── SPRINT-2-PLAN.md             # Sprint 2 implementation plan (v0.5.0)
├── SPRINT-2-IMPLEMENTATION.md   # Sprint 2 step-by-step implementation guide
├── SPRINT-3-PLAN.md             # Sprint 3 plan — real-time notifications
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
```

**Current Setup**: Self-hosted Supabase instance at `https://supabase.genzai.cloud`

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

#### 9. Animated Chart Component

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

**View**: `business_metrics` — Aggregates `transactions` to derive `total_revenue`, `revenue_change`, `sales`, `sales_change` per business (current vs previous month).

**Functions**:
- `is_admin()` — SECURITY DEFINER helper used in all RLS policies
- `get_user_role()` — RPC to get authenticated user's role
- `get_monthly_chart_data(business_id, months)` — RPC for chart data (monthly revenue via `generate_series`)

**Triggers**:
- `handle_new_user` — Auto-creates `user_profiles` row on signup with `role = 'negocio'`
- `update_updated_at` — Auto-updates `updated_at` on `user_profiles` and `businesses`

**RLS Pattern**: All tables have RLS enabled. Negocio users access only their own data (via `owner_id` or `business_id` chain). Admin users access everything via `is_admin()`.

**Indexes**: Composite index on `transactions(business_id, status, created_at DESC)` covers the main metrics/chart queries.

### Migration Files

```
supabase/migrations/
├── 001_foundation.sql           # is_admin(), user_profiles, handle_new_user trigger
├── 002_business_data.sql        # businesses, transactions, snapshots + RLS + indexes
├── 003_views_and_functions.sql  # business_metrics view, RPC functions
└── 004_seed_data.sql            # Admin promotion, 3 businesses, transactions, snapshots
```

### Current Status

- ✅ Supabase clients configured
- ✅ Environment variables set up
- ✅ Authentication system implemented
- ✅ Protected routes configured
- ✅ User session management active
- ✅ Database schema designed (4 tables + 1 view + 3 functions + 2 triggers)
- ✅ RLS policies defined for all tables
- ✅ Migration files created
- ✅ Migrations executed in Supabase (2026-04-05)
- ✅ Frontend connected to real Supabase data (mock-businesses.ts deleted)
- ✅ Hotfix: `business_metrics` view — added upper bound to current-month date filters (2026-04-05)
- ⏳ Current seed data is for testing — metrics will change for production

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

1. **Sprint 3 — Real-time Notifications** (next up)
   - Supabase Realtime subscriptions for transactions
   - Notification bell + dropdown in header
   - Webhook integration for external events
   - Detailed plan in `SPRINT-3-PLAN.md`

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

_Last Updated: 2026-04-08_  
_Version: 0.6.0_  
_Status: v0 Release — Dashboard + Auth + Roles + Recharts + DB Live + Reports Tab + CSV Export_
