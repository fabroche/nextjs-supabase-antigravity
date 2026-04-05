"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { useAuth } from "./auth-context"
import {
  fetchUserRole,
  fetchBusinesses,
  fetchBusinessMetrics,
  fetchActiveUsersSnapshot,
  fetchChartData,
  fetchRecentTransactions,
} from "@/lib/supabase/queries"
import type {
  Business,
  DbBusiness,
  DbBusinessMetrics,
  DbMetricsSnapshot,
  DbChartData,
  DbTransaction,
} from "@/lib/supabase/types"

interface BusinessContextType {
  selectedBusiness: Business | null
  selectBusinessById: (businessId: string) => void
  businesses: DbBusiness[]
  isAdmin: boolean
  isLoading: boolean
  isLoadingData: boolean
  error: string | null
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined)

// Transform raw DB data into the Business shape the frontend expects
function buildBusiness(
  db: DbBusiness,
  metrics: DbBusinessMetrics | null,
  snapshots: { current: DbMetricsSnapshot | null; previous: DbMetricsSnapshot | null },
  chartData: DbChartData[],
  transactions: DbTransaction[]
): Business {
  const curr = snapshots.current
  const prev = snapshots.previous

  const activeUsers = curr?.active_users ?? 0
  const prevActiveUsers = prev?.active_users ?? 0
  const activeNow = curr?.active_now ?? 0
  const prevActiveNow = prev?.active_now ?? 0

  return {
    id: db.id,
    name: db.name,
    currency: db.currency,
    ownerId: db.owner_id,
    metrics: {
      totalRevenue: Number(metrics?.total_revenue ?? 0),
      revenueChange: Number(metrics?.revenue_change ?? 0),
      activeUsers,
      usersChange: prevActiveUsers > 0
        ? Math.round(((activeUsers - prevActiveUsers) / prevActiveUsers) * 1000) / 10
        : 0,
      sales: Number(metrics?.sales ?? 0),
      salesChange: Number(metrics?.sales_change ?? 0),
      activeNow,
      activeNowChange: activeNow - prevActiveNow,
    },
    chartData: chartData.map(d => ({ month: d.month, value: Number(d.value) })),
    recentActivity: transactions.map(t => ({
      id: t.id,
      user: t.customer_name,
      email: t.customer_email,
      amount: `+$${Number(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      status: t.status,
    })),
  }
}

export function BusinessProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [businesses, setBusinesses] = useState<DbBusiness[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDbBusiness, setSelectedDbBusiness] = useState<DbBusiness | null>(null)
  const { user, isLoading: authLoading } = useAuth()

  // Load full business data (metrics, chart, activity) for a given business
  const loadBusinessData = useCallback(async (db: DbBusiness) => {
    setIsLoadingData(true)
    setError(null)
    try {
      const [metrics, snapshots, chart, transactions] = await Promise.all([
        fetchBusinessMetrics(db.id),
        fetchActiveUsersSnapshot(db.id),
        fetchChartData(db.id),
        fetchRecentTransactions(db.id),
      ])
      const business = buildBusiness(db, metrics, snapshots, chart, transactions)
      setSelectedBusiness(business)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading business data')
    } finally {
      setIsLoadingData(false)
    }
  }, [])

  // Initial load: fetch role + businesses list when user is available
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setIsAdmin(false)
      setBusinesses([])
      setSelectedBusiness(null)
      setSelectedDbBusiness(null)
      setIsLoading(false)
      return
    }

    async function init() {
      setIsLoading(true)
      setError(null)
      try {
        const [role, bizList] = await Promise.all([
          fetchUserRole(),
          fetchBusinesses(),
        ])
        setIsAdmin(role === 'admin')
        setBusinesses(bizList)

        if (bizList.length > 0) {
          setSelectedDbBusiness(bizList[0])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading businesses')
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [user, authLoading])

  // Load business data when selection changes
  useEffect(() => {
    if (selectedDbBusiness) {
      loadBusinessData(selectedDbBusiness)
    }
  }, [selectedDbBusiness, loadBusinessData])

  // Select a business by its ID (used by header selector)
  const selectBusinessById = useCallback((businessId: string) => {
    const db = businesses.find(b => b.id === businessId)
    if (db) {
      setSelectedDbBusiness(db)
    }
  }, [businesses])

  const contextValue = React.useMemo(
    () => ({
      selectedBusiness,
      selectBusinessById,
      businesses,
      isAdmin,
      isLoading,
      isLoadingData,
      error,
    }),
    [selectedBusiness, selectBusinessById, businesses, isAdmin, isLoading, isLoadingData, error]
  )

  return (
    <BusinessContext.Provider value={contextValue}>
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusiness() {
  const context = useContext(BusinessContext)
  if (context === undefined) {
    throw new Error("useBusiness must be used within a BusinessProvider")
  }
  return context
}
