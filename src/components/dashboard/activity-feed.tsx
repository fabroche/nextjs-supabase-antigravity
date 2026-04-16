'use client'
import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const SOURCE_OPTIONS = [
  { value: 'all', label: 'Todas las fuentes' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'dokploy', label: 'Dokploy' },
  { value: 'n8n', label: 'N8N' },
  { value: 'notion', label: 'Notion' },
]

const ENRICHMENT_TIMEOUT_MS = 15_000

function isEnrichmentPending(event: DbActivityFeed): boolean {
  return event.source === 'n8n' && event.metadata?.enrichment_pending === true
}

function useEnrichmentEscape(events: DbActivityFeed[]): Set<string> {
  const [expired, setExpired] = useState<Set<string>>(new Set())

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    for (const event of events) {
      if (!isEnrichmentPending(event) || expired.has(event.id)) continue
      const age = Date.now() - new Date(event.created_at).getTime()
      const remaining = ENRICHMENT_TIMEOUT_MS - age
      if (remaining <= 0) {
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
  const [source, setSource] = useState<string | undefined>(undefined)
  const { events, isConnected, isLoading, isLoadingMore, hasMore, loadMore } =
    useActivityFeed(source)
  const expiredPending = useEnrichmentEscape(events)

  function handleSourceChange(value: string) {
    setSource(value === 'all' ? undefined : value)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              {isLoading
                ? 'Cargando…'
                : events.length === 0
                  ? 'Sin actividad reciente'
                  : `${events.length} eventos`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={source ?? 'all'} onValueChange={handleSourceChange}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-5 w-5 rounded-full shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {source
              ? `Sin actividad de ${source} reciente`
              : 'Los eventos de Telegram, Dokploy, Notion y N8N apareceran aqui en tiempo real.'}
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const showSkeleton = isEnrichmentPending(event) && !expiredPending.has(event.id)
              return (
                <div
                  key={event.id}
                  className={`flex items-start gap-3 text-sm ${event.severity ? (SEVERITY_STYLES[event.severity] ?? '') : ''}`}
                >
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

            {hasMore && (
              <div className="pt-2 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="text-xs text-muted-foreground"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Cargando…
                    </>
                  ) : (
                    'Cargar más'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
