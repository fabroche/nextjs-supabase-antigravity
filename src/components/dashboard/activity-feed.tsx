'use client'
import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Wifi, WifiOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useActivityFeed } from '@/hooks/use-activity-feed'
import type { DbActivityFeed } from '@/lib/supabase/types'

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

// Max time to wait for enrichment before giving up and hiding the skeleton.
// Protects against silent Realtime drops / edge-case backend hangs.
const ENRICHMENT_TIMEOUT_MS = 15_000

function isEnrichmentPending(event: DbActivityFeed): boolean {
  return event.source === 'n8n' && event.metadata?.enrichment_pending === true
}

/**
 * Hook that tracks which events have exceeded the enrichment timeout,
 * so we can hide their skeleton even if the UPDATE never arrives.
 */
function useEnrichmentEscape(events: DbActivityFeed[]): Set<string> {
  const [expired, setExpired] = useState<Set<string>>(new Set())

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    for (const event of events) {
      if (!isEnrichmentPending(event) || expired.has(event.id)) continue
      const age = Date.now() - new Date(event.created_at).getTime()
      const remaining = ENRICHMENT_TIMEOUT_MS - age
      if (remaining <= 0) {
        // Already past the deadline (e.g. event was loaded from initial fetch)
        setExpired((prev) => new Set(prev).add(event.id))
        continue
      }
      timers.push(
        setTimeout(() => {
          setExpired((prev) => new Set(prev).add(event.id))
        }, remaining)
      )
    }
    return () => timers.forEach(clearTimeout)
  }, [events, expired])

  return expired
}

export function ActivityFeed() {
  const { events, isConnected } = useActivityFeed()
  const expiredPending = useEnrichmentEscape(events)

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
            {events.map((event) => {
              const showSkeleton = isEnrichmentPending(event) && !expiredPending.has(event.id)
              return (
                <div key={event.id} className={`flex items-start gap-3 text-sm ${event.severity ? SEVERITY_STYLES[event.severity] ?? '' : ''}`}>
                  <span className="text-base leading-none mt-0.5">
                    {SOURCE_ICONS[event.source] ?? '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="leading-snug line-clamp-2">
                      {event.description}
                      {showSkeleton && (
                        <span className="ml-2 inline-flex items-center gap-1.5 align-middle">
                          <Skeleton className="h-3.5 w-28" />
                          <span className="text-xs text-muted-foreground italic">
                            Calculando costo…
                          </span>
                        </span>
                      )}
                    </p>
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
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
