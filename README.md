# 📊 Next.js Supabase Dashboard

A modern, responsive metrics dashboard built with Next.js 16, Supabase, and shadcn/ui. Monitor your project's performance with real-time analytics and beautiful visualizations.

![Dashboard Preview](https://img.shields.io/badge/Next.js-16.1.1-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Ready-green?style=for-the-badge&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=for-the-badge&logo=tailwind-css)

---

## ✨ Features

- 📈 **Metrics Dashboard** - Real-time monitoring of key performance indicators
- 🎨 **Modern UI** - Built with shadcn/ui components and Tailwind CSS v4
- 📱 **Responsive Design** - Optimized for desktop, tablet, and mobile
- 🌓 **Dark Mode** - Automatic theme switching support
- 🔐 **Client-Side Authentication** - Secure login/register with real-time session sync
- ✉️ **OTP Email Verification** - 6-digit code verification for new users
- 👥 **Role-Based Access** - Admin and regular user roles with different permissions
- 🏢 **Multi-Business Support** - Admin users can switch between businesses
- 🔄 **Real-Time Updates** - Dashboard updates instantly without page refresh
- 🛡️ **Protected Routes** - Middleware-based route protection
- 👤 **User Management** - Centralized auth state with AuthContext
- ⚡ **Fast & Optimized** - Server-side rendering with Next.js 16
- 🎯 **TypeScript** - Full type safety throughout the application
- 📊 **Reports Tab** - Transaction reports with date range picker and CSV export

### Current Dashboard Components

- **Business Selector** - Dropdown to switch between different businesses
- **Collapsible Sidebar** - Easy navigation with icon-only collapsed state
- **Search & Notifications** - Quick access to search and notification center
- **Metric Cards** - Display key metrics with trend indicators (dynamic per business)
  - Total Revenue
  - Active Users
  - Sales
  - Active Now
- **Animated Overview Chart** - Visual representation of monthly data with smooth transitions
- **Recent Activity Table** - Latest transactions and user activity (per business)
- **Tab Navigation** - Organized sections (Overview, Analytics, Reports)
- **Theme Toggle** - Switch between light and dark modes

---

## 🔐 Authentication

The application uses a **client-side authentication** approach with centralized state management.

### Features

- ✅ **Client-Side Auth** - Direct Supabase client calls for instant session sync
- ✅ **AuthContext** - Centralized authentication state management
- ✅ **Email/Password Login** - Secure authentication with real-time updates
- ✅ **User Registration** - New user sign-up with OTP email verification
- ✅ **OTP Verification** - 6-digit code sent via email using shadcn input-otp component
- ✅ **Session Management** - Persistent sessions with automatic state sync
- ✅ **Protected Routes** - Automatic redirect for unauthenticated users
- ✅ **User Menu** - Profile dropdown with logout functionality
- ✅ **Password Reset** - "Forgot password" link (requires Supabase configuration)

### Architecture

**AuthContext** (`src/contexts/auth-context.tsx`):

- Listens to Supabase `onAuthStateChange` events
- Provides `user` and `isLoading` state to entire app
- Single source of truth for authentication state

**BusinessContext** (`src/contexts/business-context.tsx`):

- Consumes AuthContext for user information
- Manages business selection and role-based access
- Automatically updates when user changes

### Using Authentication

**Login Page**: Navigate to `/login` to access the authentication page

**Test Credentials** (if you have a test user):

```
Email: your-email@example.com
Password: your-password
```

**Logout**: Click on your avatar in the top-right corner and select "Cerrar sesión"

### Authentication Flow

1. **Unauthenticated users** are automatically redirected to `/login`
2. **New users register** → Receive 6-digit OTP code via email
3. **User enters OTP** on `/verify-email` page → Email verified
4. **After verification**, users can log in
5. **Login** → Client-side auth → `onAuthStateChange` fires → AuthContext updates
6. **Dashboard loads** → BusinessContext reads user → Determines role and business
7. **Session persists** across page refreshes with automatic sync
8. **Logout** clears the session and redirects to `/login`

### Role-Based Access

**Admin Users** (configured via `NEXT_PUBLIC_ADMIN_EMAIL`):

- Can see business selector in header
- Can switch between all businesses
- View metrics for any business

**Regular Users**:

- No business selector visible
- See only their associated business
- Business determined by `ownerEmail` in mock data

### Supabase Auth Setup

To enable authentication in your Supabase project:

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Enable **Email** provider
3. Configure email templates (optional)
4. Set up SMTP for production email delivery (optional)

> **Note**: Users can register and login even without email verification. You can enforce email verification in Supabase settings if needed.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or higher
- **npm**, **yarn**, **pnpm**, or **bun**
- **Supabase Account** (for backend services)

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd nextjs-supabase
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**

   Copy the example environment file:

   ```bash
   cp env.example.txt .env.local
   ```

   Edit `.env.local` and add your Supabase credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_ADMIN_EMAIL=admin@example.com
   ```

   > 💡 **Finding your Supabase credentials:**
   >
   > 1. Go to your Supabase project dashboard
   > 2. Navigate to **Settings** → **API**
   > 3. Copy the **Project URL** and **anon/public key**

4. **Run the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see your dashboard.

---

## 📁 Project Structure

```
nextjs-supabase/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── auth/callback/     # OAuth callback handler
│   │   ├── login/             # Authentication pages
│   │   │   └── page.tsx       # Login/Register page (client-side)
│   │   ├── verify-email/      # OTP verification
│   │   ├── layout.tsx         # Root layout with providers
│   │   ├── page.tsx           # Dashboard home
│   │   └── globals.css        # Global styles + theme
│   ├── components/
│   │   ├── dashboard/         # Dashboard components
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx     # With business selector
│   │   │   ├── metric-card.tsx
│   │   │   ├── overview-chart.tsx  # Animated chart
│   │   │   └── recent-activity.tsx
│   │   ├── reports/           # Reports tab components
│   │   │   ├── date-range-picker.tsx
│   │   │   ├── report-table.tsx
│   │   │   └── export-button.tsx
│   │   └── ui/                # shadcn/ui components
│   ├── contexts/              # React contexts
│   │   ├── auth-context.tsx   # Authentication state
│   │   └── business-context.tsx  # Business selection
│   ├── lib/
│   │   ├── auth/              # Authentication utilities
│   │   │   └── actions.ts     # Server actions (logout)
│   │   ├── data/              # Mock data
│   │   │   └── mock-businesses.ts  # Business data
│   │   ├── supabase/          # Supabase clients
│   │   │   ├── client.ts      # Client-side client
│   │   │   ├── server.ts      # Server-side client
│   │   │   └── middleware.ts  # Session management
│   │   └── utils.ts           # Utility functions
│   └── middleware.ts          # Route protection
├── public/
│   └── assets/
│       └── login-cover.png    # Login page image
├── supabase/
│   └── migrations/            # SQL migration files
│       ├── 001_foundation.sql
│       ├── 002_business_data.sql
│       ├── 003_views_and_functions.sql
│       └── 004_seed_data.sql
├── components.json            # shadcn/ui config
├── claude.md                  # Project memory & context
└── README.md                  # This file
```

---

## 🛠️ Development

### Available Scripts

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Adding shadcn/ui Components

This project uses [shadcn/ui](https://ui.shadcn.com/) for UI components. Add new components with:

```bash
npx shadcn@latest add [component-name]
```

Examples:

```bash
npx shadcn@latest add form
npx shadcn@latest add dialog
npx shadcn@latest add select
npx shadcn@latest add calendar
```

### Working with Supabase

**Client-side data fetching:**

```typescript
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const { data } = await supabase.from("table").select();
```

**Server-side data fetching:**

```typescript
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();
const { data } = await supabase.from("table").select();
```

---

## 🎨 Customization

### Theme Colors

Edit theme colors in `src/app/globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  /* ... more variables */
}

.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  /* ... dark mode variables */
}
```

### Adding New Metrics

Create a new metric card:

```typescript
<MetricCard
  title="Your Metric"
  value="123"
  change="+10% from last month"
  changeType="positive"
  icon={YourIcon}
/>
```

### Sidebar Navigation

Update navigation items in `src/components/dashboard/sidebar.tsx`:

```typescript
const sidebarNav = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  // Add your routes here
];
```

---

## 🗄️ Database Setup

### Schema Overview

The database consists of 4 tables, 1 view, and 3 helper functions:

| Table | Purpose |
|-------|---------|
| `user_profiles` | User roles (admin/negocio), linked 1:1 to `auth.users` |
| `businesses` | Business entities owned by users (1 user = N businesses) |
| `transactions` | All financial transactions — metrics are derived from this |
| `business_metrics_snapshot` | Daily snapshots for non-transaction metrics (active users) |

### Running Migrations

Execute the SQL migration files in order in your Supabase SQL Editor:

```bash
supabase/migrations/
├── 001_foundation.sql           # Functions, user_profiles, triggers
├── 002_business_data.sql        # businesses, transactions, snapshots + RLS
├── 003_views_and_functions.sql  # business_metrics view, RPC functions
└── 004_seed_data.sql            # Initial data (run after users sign up)
```

### Row Level Security (RLS)

All tables have RLS enabled:
- **Admin** users can read/write all data
- **Negocio** users can only access their own businesses and transactions
- Role check uses a `SECURITY DEFINER` function (`is_admin()`) to avoid RLS recursion

### Key Database Functions

| Function | Purpose |
|----------|---------|
| `is_admin()` | Check if current user is admin (used in RLS policies) |
| `get_user_role()` | RPC to get the authenticated user's role |
| `get_monthly_chart_data(business_id, months)` | RPC to get monthly revenue for charts |
| `business_metrics` (view) | Aggregated revenue/sales metrics per business |

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/nextjs-supabase)

### Environment Variables for Production

Make sure to add these in your hosting platform:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 📚 Tech Stack

- **[Next.js 16](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Supabase](https://supabase.com/)** - Backend as a Service
- **[shadcn/ui](https://ui.shadcn.com/)** - UI component library
- **[Tailwind CSS v4](https://tailwindcss.com/)** - Utility-first CSS
- **[Radix UI](https://www.radix-ui.com/)** - Headless UI primitives
- **[Lucide Icons](https://lucide.dev/)** - Icon library
- **[Recharts](https://recharts.org/)** - Data visualization
- **[PapaParse](https://www.papaparse.com/)** - CSV export

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📖 Documentation

- **[claude.md](./claude.md)** - Complete project context and architecture
- **[Next.js Docs](https://nextjs.org/docs)** - Next.js documentation
- **[Supabase Docs](https://supabase.com/docs)** - Supabase documentation
- **[shadcn/ui Docs](https://ui.shadcn.com/)** - Component documentation

---

## 🐛 Troubleshooting

### Development server won't start

- Ensure Node.js version is 18.x or higher
- Delete `node_modules` and `.next` folders, then run `npm install`

### Supabase connection errors

- Verify your `.env.local` file has correct credentials
- Check if your Supabase project is active
- Ensure environment variables are prefixed with `NEXT_PUBLIC_`

### Styling issues

- Clear browser cache
- Restart development server
- Check for Tailwind CSS v4 compatibility

---

## 📝 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- [shadcn](https://twitter.com/shadcn) for the amazing UI components
- [Vercel](https://vercel.com) for Next.js
- [Supabase](https://supabase.com) for the backend platform

---

**Built with ❤️ using Next.js and Supabase**
