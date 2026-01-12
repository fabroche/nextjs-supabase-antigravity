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
- 🔐 **Supabase Integration** - Backend ready for authentication and data management
- ⚡ **Fast & Optimized** - Server-side rendering with Next.js 16
- 🎯 **TypeScript** - Full type safety throughout the application

### Current Dashboard Components

- **Collapsible Sidebar** - Easy navigation with icon-only collapsed state
- **Search & Notifications** - Quick access to search and notification center
- **Metric Cards** - Display key metrics with trend indicators
  - Total Revenue
  - Active Users
  - Sales
  - Active Now
- **Overview Chart** - Visual representation of monthly data
- **Recent Activity Table** - Latest transactions and user activity
- **Tab Navigation** - Organized sections (Overview, Analytics, Reports)

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
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Dashboard home
│   │   └── globals.css        # Global styles + theme
│   ├── components/
│   │   ├── dashboard/         # Dashboard components
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── metric-card.tsx
│   │   │   ├── overview-chart.tsx
│   │   │   └── recent-activity.tsx
│   │   └── ui/                # shadcn/ui components
│   ├── lib/
│   │   ├── supabase/          # Supabase clients
│   │   └── utils.ts           # Utility functions
│   └── middleware.ts          # Next.js middleware
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

### Supabase Tables (Example)

Create tables in your Supabase project for metrics:

```sql
-- Example: Metrics table
create table metrics (
  id uuid default uuid_generate_v4() primary key,
  metric_name text not null,
  value numeric not null,
  change_percentage numeric,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Example: Activity logs
create table activity_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users,
  action text not null,
  amount numeric,
  status text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
```

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
