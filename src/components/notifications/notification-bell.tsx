'use client'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotifications } from '@/hooks/use-notifications'
import { useAuth } from '@/contexts/auth-context'
import { NotificationItem } from './notification-item'

export function NotificationBell() {
  const { user } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(user?.id)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Marcar todas como leidas
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sin notificaciones
            </p>
          ) : (
            notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} onRead={markAsRead} />
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
