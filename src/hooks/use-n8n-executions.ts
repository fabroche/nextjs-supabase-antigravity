"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { DbN8NExecution } from "@/lib/supabase/types"

interface UseN8NExecutionsReturn {
  lastExecutionAt: string | null
  isConnected: boolean
}

export function useN8NExecutions(): UseN8NExecutionsReturn {
  const [lastExecutionAt, setLastExecutionAt] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('n8n-executions-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'n8n_executions' },
        (payload) => {
          const row = payload.new as DbN8NExecution
          setLastExecutionAt(row.created_at)
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { lastExecutionAt, isConnected }
}
