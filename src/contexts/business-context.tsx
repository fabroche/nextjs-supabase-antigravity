"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"
import { Business, mockBusinesses } from "@/lib/data/mock-businesses"

interface BusinessContextType {
  selectedBusiness: Business
  setSelectedBusiness: (business: Business) => void
  businesses: Business[]
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined)

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [selectedBusiness, setSelectedBusiness] = useState<Business>(mockBusinesses[0])

  return (
    <BusinessContext.Provider
      value={{
        selectedBusiness,
        setSelectedBusiness,
        businesses: mockBusinesses,
      }}
    >
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
