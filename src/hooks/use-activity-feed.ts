'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchActivityFeed } from '@/lib/supabase/queries'
import type { DbActivityFeed } from '@/lib/supabase/types'

export function useActivityFeed(limit = 50) {
  const [events, setEvents] = useState<DbActivityFeed[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    fetchActivityFeed(limit).then(setEvents).catch(console.error)

    const channel = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_feed' },
        (payload) => {
          setEvents((prev) => [payload.new as DbActivityFeed, ...prev].slice(0, limit))
        }
      )
      .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel) }
  }, [limit])

  return { events, isConnected }
}
