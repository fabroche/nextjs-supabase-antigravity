"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MobileSidebar } from "./sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { signOut } from "@/lib/auth/actions"
import { useBusiness } from "@/contexts/business-context"
import { useAuth } from "@/contexts/auth-context"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { fetchUserProfile } from "@/lib/supabase/queries"
import type { DbUserProfile } from "@/lib/supabase/types"

export function Header() {
  const { user } = useAuth()
  const { selectedBusiness, selectBusinessById, businesses, isAdmin, isLoading } = useBusiness()
  const [profile, setProfile] = useState<DbUserProfile | null>(null)

  useEffect(() => {
    fetchUserProfile().then(setProfile).catch(() => {})
  }, [])

  async function handleSignOut() {
    await signOut()
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <MobileSidebar />
      
      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {/* Business Selector - Only visible for admin users */}
        {!isLoading && isAdmin && selectedBusiness && (
          <Select value={selectedBusiness.id} onValueChange={selectBusinessById}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {businesses.map((business) => (
                <SelectItem key={business.id} value={business.id}>
                  {business.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <ThemeToggle />
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt="User" />
                <AvatarFallback>
                  {profile?.full_name
                    ? profile.full_name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
                    : user?.email?.[0].toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">Mi Cuenta</p>
                <p className="text-xs text-muted-foreground">
                  {user?.email || "usuario@ejemplo.com"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <User className="mr-2 h-4 w-4" />
                Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
