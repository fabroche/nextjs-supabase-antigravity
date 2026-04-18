"use client"

import { useState, useEffect, useCallback } from 'react'
import { fetchUiPreferences, updateUiPreferences } from '@/lib/supabase/queries'
import type { UiPreferences } from '@/lib/supabase/types'

export function useUiPreferences() {
  const [prefs, setPrefs] = useState<UiPreferences>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUiPreferences()
      .then(setPrefs)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const isHidden = useCallback(
    (scopeKey: string, metricKey: string): boolean => {
      return prefs.hidden_metrics?.[scopeKey]?.includes(metricKey) ?? false
    },
    [prefs]
  )

  const getHiddenKeys = useCallback(
    (scopeKey: string): string[] => {
      return prefs.hidden_metrics?.[scopeKey] ?? []
    },
    [prefs]
  )

  const toggleMetric = useCallback(
    async (scopeKey: string, metricKey: string) => {
      const current = prefs.hidden_metrics?.[scopeKey] ?? []
      const isCurrentlyHidden = current.includes(metricKey)
      const updated: UiPreferences = {
        ...prefs,
        hidden_metrics: {
          ...prefs.hidden_metrics,
          [scopeKey]: isCurrentlyHidden
            ? current.filter((k) => k !== metricKey)
            : [...current, metricKey],
        },
      }
      setPrefs(updated)
      try {
        await updateUiPreferences(updated)
      } catch {
        setPrefs(prefs)
      }
    },
    [prefs]
  )

  const showAll = useCallback(
    async (scopeKey: string) => {
      const updated: UiPreferences = {
        ...prefs,
        hidden_metrics: {
          ...prefs.hidden_metrics,
          [scopeKey]: [],
        },
      }
      setPrefs(updated)
      try {
        await updateUiPreferences(updated)
      } catch {
        setPrefs(prefs)
      }
    },
    [prefs]
  )

  return { prefs, isLoading, isHidden, getHiddenKeys, toggleMetric, showAll }
}
