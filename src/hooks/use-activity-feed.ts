'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchActivityFeed } from '@/lib/supabase/queries'
import type { DbActivityFeed } from '@/lib/supabase/types'

const PAGE_SIZE = 20

export function useActivityFeed(source?: string) {
  const [events, setEvents] = useState<DbActivityFeed[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  // Initial load / reload when source filter changes
  const reload = useCallback(async (src?: string) => {
    setIsLoading(true)
    try {
      const data = await fetchActivityFeed(PAGE_SIZE, 0, src)
      setEvents(data)
      setOffset(data.length)
      setHasMore(data.length === PAGE_SIZE)
    } catch (err) {
      console.error('[use-activity-feed] initial load failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reload(source)
  }, [reload, source])

  // Load older events
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const data = await fetchActivityFeed(PAGE_SIZE, offset, source)
      setEvents((prev) => [...prev, ...data])
      setOffset((prev) => prev + data.length)
      setHasMore(data.length === PAGE_SIZE)
    } catch (err) {
      console.error('[use-activity-feed] load more failed:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, offset, source])

  // Realtime — always on, filter client-side for INSERT
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_feed' },
        (payload) => {
          const newEvent = payload.new as DbActivityFeed
          if (source && newEvent.source !== source) return
          setEvents((prev) => [newEvent, ...prev])
          setOffset((prev) => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'activity_feed' },
        (payload) => {
          const updated = payload.new as DbActivityFeed
          setEvents((prev) =>
            prev.map((e) => (e.id === updated.id ? updated : e))
          )
        }
      )
      .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel) }
  }, [source])

  return { events, isConnected, isLoading, isLoadingMore, hasMore, loadMore }
}
