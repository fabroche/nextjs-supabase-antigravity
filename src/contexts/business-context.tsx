"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { Business, mockBusinesses, getBusinessByOwner, isAdminUser } from "@/lib/data/mock-businesses"
import { useAuth } from "./auth-context"

interface BusinessContextType {
  selectedBusiness: Business | null
  setSelectedBusiness: (business: Business) => void
  businesses: Business[]
  isAdmin: boolean
  isLoading: boolean
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined)

export function BusinessProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { user, isLoading: authLoading } = useAuth()

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return
    }

    setIsLoading(true)
    const userEmail = user?.email

    if (userEmail) {
      const userIsAdmin = isAdminUser(userEmail)
      setIsAdmin(userIsAdmin)

      if (userIsAdmin) {
        // Admin can see all businesses, default to first one
        setSelectedBusiness(mockBusinesses[0])
      } else {
        // Regular user sees only their business
        const userBusiness = getBusinessByOwner(userEmail)
        if (userBusiness) {
          setSelectedBusiness(userBusiness)
        } else {
          // Fallback to first business if no match found
          setSelectedBusiness(mockBusinesses[0])
        }
      }
    } else {
      // No user logged in, default to first business
      setIsAdmin(false)
      setSelectedBusiness(mockBusinesses[0])
    }

    setIsLoading(false)
  }, [user, authLoading])

  const contextValue = React.useMemo(
    () => ({
      selectedBusiness,
      setSelectedBusiness,
      businesses: mockBusinesses,
      isAdmin,
      isLoading,
    }),
    [selectedBusiness, isAdmin, isLoading]
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
