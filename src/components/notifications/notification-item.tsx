import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { DbNotification } from '@/lib/supabase/types'

const SOURCE_ICONS: Record<string, string> = {
  telegram: '✈️',
  dokploy: '🚀',
  notion: '📝',
  n8n: '⚡',
}

interface NotificationItemProps {
  notification: DbNotification
  onRead: (id: string) => void
}

export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  return (
    <button
      onClick={() => !notification.read && onRead(notification.id)}
      className={cn(
        'flex w-full gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50',
        !notification.read && 'bg-muted/30'
      )}
    >
      <span className="text-base leading-none mt-0.5">
        {SOURCE_ICONS[notification.source] ?? '🔔'}
      </span>
      <div className="flex-1 space-y-1 overflow-hidden">
        <p className={cn('line-clamp-2 leading-snug', !notification.read && 'font-medium')}>
          {notification.description}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
        </p>
      </div>
      {!notification.read && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  )
}
