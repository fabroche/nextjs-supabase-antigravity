'use client'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Wifi, WifiOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useActivityFeed } from '@/hooks/use-activity-feed'

const SOURCE_ICONS: Record<string, string> = {
  telegram: '✈️',
  dokploy: '🚀',
  notion: '📝',
  n8n: '⚡',
}

const SEVERITY_STYLES: Record<string, string> = {
  success: 'border-l-2 border-l-green-500 bg-green-500/5 pl-3 pr-2 py-1.5 rounded-r-md',
  warning: 'border-l-2 border-l-yellow-500 bg-yellow-500/5 pl-3 pr-2 py-1.5 rounded-r-md',
  error: 'border-l-2 border-l-destructive bg-destructive/5 pl-3 pr-2 py-1.5 rounded-r-md',
}

export function ActivityFeed() {
  const { events, isConnected } = useActivityFeed()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              {events.length === 0
                ? 'Sin actividad reciente'
                : `${events.length} eventos`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isConnected ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-green-500" />
                En vivo
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5" />
                Desconectado
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Los eventos de Telegram, Dokploy, Notion y N8N apareceran aqui en tiempo real.
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className={`flex items-start gap-3 text-sm ${event.severity ? SEVERITY_STYLES[event.severity] ?? '' : ''}`}>
                <span className="text-base leading-none mt-0.5">
                  {SOURCE_ICONS[event.source] ?? '🔔'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="leading-snug line-clamp-2">{event.description}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {event.channel && (
                      <>
                        <span>{event.channel}</span>
                        <span>·</span>
                      </>
                    )}
                    <span>
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
