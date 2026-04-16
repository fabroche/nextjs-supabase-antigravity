"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ChevronLeft,
  Menu,
  Zap,
  Settings,
  ShieldAlert,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useBusiness } from "@/contexts/business-context"

const mainNav = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Automatizaciones", href: "/automatizaciones", icon: Zap },
]

const settingsNav = [
  { title: "Ajustes", href: "/settings", icon: Settings },
]

const adminNav = [
  { title: "Dead Letters", href: "/admin/dead-letters", icon: ShieldAlert },
]

function NavItem({
  item,
  isActive,
  collapsed,
}: {
  item: { title: string; href: string; icon: React.ElementType }
  isActive: boolean
  collapsed?: boolean
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        collapsed && "justify-center"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{item.title}</span>}
    </Link>
  )
}

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false)
  const pathname = usePathname()
  const { isAdmin } = useBusiness()

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <LayoutDashboard className="h-6 w-6" />
            <span>Dashboard</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn("ml-auto", collapsed && "mx-auto")}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {mainNav.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={isActive(item.href)}
            collapsed={collapsed}
          />
        ))}

        <div className={cn("pt-3", !collapsed && "border-t mt-3")}>
          {!collapsed && (
            <p className="px-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">
              Cuenta
            </p>
          )}
          {settingsNav.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              isActive={isActive(item.href)}
              collapsed={collapsed}
            />
          ))}
        </div>

        {isAdmin && (
          <div className={cn("pt-3", !collapsed && "border-t mt-3")}>
            {!collapsed && (
              <p className="px-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                Admin
              </p>
            )}
            {adminNav.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                isActive={isActive(item.href)}
                collapsed={collapsed}
              />
            ))}
          </div>
        )}
      </nav>
    </aside>
  )
}

export function MobileSidebar() {
  const pathname = usePathname()
  const { isAdmin } = useBusiness()

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href)
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-16 items-center px-4 border-b">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <LayoutDashboard className="h-6 w-6" />
            <span>Dashboard</span>
          </Link>
        </div>
        <nav className="p-2 space-y-0.5">
          {mainNav.map((item) => (
            <NavItem key={item.href} item={item} isActive={isActive(item.href)} />
          ))}

          <div className="border-t mt-3 pt-3">
            <p className="px-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">
              Cuenta
            </p>
            {settingsNav.map((item) => (
              <NavItem key={item.href} item={item} isActive={isActive(item.href)} />
            ))}
          </div>

          {isAdmin && (
            <div className="border-t mt-3 pt-3">
              <p className="px-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                Admin
              </p>
              {adminNav.map((item) => (
                <NavItem key={item.href} item={item} isActive={isActive(item.href)} />
              ))}
            </div>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
