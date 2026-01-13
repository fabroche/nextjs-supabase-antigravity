# Project Context & Memory

## Project Overview

**Project Name**: Next.js Supabase Dashboard  
**Purpose**: Multi-business metrics dashboard with OTP authentication for monitoring analytics  
**Tech Stack**: Next.js 16, TypeScript, Supabase Auth, shadcn/ui, Tailwind CSS v4  
**Development Status**: Dashboard, OTP authentication, and business selector complete

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

4. **Version Updates**:
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
│   │   └── business-context.tsx  # Business state management
│   ├── lib/
│   │   ├── auth/
│   │   │   └── actions.ts        # Server actions for authentication
│   │   ├── data/
│   │   │   └── mock-businesses.ts # Mock business data
│   │   ├── supabase/
│   │   │   ├── client.ts         # Client-side Supabase client
│   │   │   ├── server.ts         # Server-side Supabase client
│   │   │   └── middleware.ts     # Session management
│   │   └── utils.ts              # cn() utility for class merging
│   └── middleware.ts             # Route protection middleware
├── public/
│   └── assets/
│       └── login-cover.png       # Login page cover image
├── components.json               # shadcn/ui configuration
├── tsconfig.json                 # TypeScript configuration
├── .env.local                    # Environment variables (gitignored)
└── package.json                  # Dependencies
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
```

**Current Setup**: Self-hosted Supabase instance at `https://supabase.genzai.cloud`

---

## Dashboard Implementation

### Current Features

#### 1. Layout System

- **Sidebar Navigation** (Desktop)
  - Collapsible: 256px expanded → 64px collapsed
  - Navigation items: Dashboard, Analytics, Reports, Settings
  - Active state highlighting
  - Smooth transitions
- **Mobile Sidebar**
  - Sheet overlay triggered by hamburger menu
  - Full navigation access on mobile

#### 2. Header Component

- Search bar with icon
- Notification bell (with badge indicator)
- User dropdown menu:
  - Profile information
  - Settings link
  - Logout option

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

- **Overview Chart**: Simple bar chart (6 months)
  - Placeholder for advanced charting library (Recharts recommended)
- **Recent Activity Table**: 5 recent transactions
  - User avatars
  - Status badges
  - Transaction amounts

#### 5. Tab Navigation

- Overview (default)
- Analytics (placeholder)
- Reports (placeholder)

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

#### 7. Business Context System

**Business Context** (`contexts/business-context.tsx`):

- React Context for sharing selected business across components
- Provides `selectedBusiness`, `setSelectedBusiness`, and `businesses` array
- Wraps entire app in `layout.tsx`

**Mock Business Data** (`lib/data/mock-businesses.ts`):

- Three sample businesses with complete metrics:
  - Tech Solutions Inc.
  - E-Commerce Pro
  - Marketing Agency
- Each business includes:
  - Unique metrics (revenue, users, sales, active now)
  - 6 months of chart data with varied values
  - 5 recent activity transactions
  - Status indicators (success, pending, failed)

**Business Selector** (in `header.tsx`):

- Select dropdown before theme toggle
- Displays all available businesses
- Updates context when selection changes
- Triggers automatic dashboard updates

**Dynamic Dashboard Updates**:

- Metric cards update with selected business data
- Chart animates smoothly between business data (500ms transition)
- Recent activity table shows business-specific transactions
- All changes happen instantly when business is selected

#### 8. Animated Chart Component

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

### Current Status

- ✅ Supabase clients configured
- ✅ Environment variables set up
- ✅ Authentication system implemented
- ✅ Protected routes configured
- ✅ User session management active
- ⏳ Database schema for metrics not yet defined
- ⏳ No active data queries implemented (using mock data)

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

1. **Database Schema Design**

   - Define metrics tables
   - User management
   - Activity logs
   - Analytics data

2. **Data Integration**

   - Connect metric cards to real Supabase data
   - Implement data fetching in Server Components
   - Add loading states

3. **Advanced Charting**

   - Install Recharts: `npm install recharts`
   - Replace placeholder chart with real visualizations
   - Add interactive features

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
  - Select dropdown in header
  - Dynamic metric updates
  - Animated chart transitions
  - Per-business activity data

---

- **Real-time Updates**: Supabase subscriptions
- **Filtering & Date Ranges**: Date pickers, custom filters
- **Export Functionality**: PDF/CSV reports
- **Analytics Page**: Detailed analytics views
- **Reports Page**: Custom report generation
- **Settings Page**: User preferences, team management
- **Notifications**: Real-time notification system
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

1. **Chart Library**: Current chart is a placeholder. Integrate Recharts or similar for production.
2. **Avatar Images**: Placeholder paths (`/avatars/01.png`) need real images or dynamic generation.
3. **Mock Data**: All current data is hardcoded. Replace with Supabase queries.
4. **Navigation Routes**: Analytics, Reports, Settings routes not yet created.
5. **Error Handling**: Add error boundaries and loading states.
6. **Accessibility**: Ensure ARIA labels and keyboard navigation.

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

### Development

- ESLint
- TypeScript types
- Tailwind PostCSS plugin

---

## Quick Reference

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

_Last Updated: 2026-01-13_  
_Version: 0.3.0_  
_Status: Dashboard + OTP Authentication + Business Selector Complete_
