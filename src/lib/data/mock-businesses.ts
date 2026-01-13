// Mock data for businesses and their metrics

export interface Business {
  id: string
  name: string
  metrics: {
    totalRevenue: number
    revenueChange: number
    activeUsers: number
    usersChange: number
    sales: number
    salesChange: number
    activeNow: number
    activeNowChange: number
  }
  recentActivity: Array<{
    id: string
    user: string
    email: string
    amount: string
    status: "success" | "pending" | "failed"
  }>
  chartData: Array<{
    month: string
    value: number
  }>
}

export const mockBusinesses: Business[] = [
  {
    id: "business-1",
    name: "Tech Solutions Inc.",
    metrics: {
      totalRevenue: 45231.89,
      revenueChange: 20.1,
      activeUsers: 2350,
      usersChange: 180.1,
      sales: 12234,
      salesChange: 19,
      activeNow: 573,
      activeNowChange: 201,
    },
    recentActivity: [
      {
        id: "1",
        user: "Olivia Martin",
        email: "olivia.martin@email.com",
        amount: "+$1,999.00",
        status: "success",
      },
      {
        id: "2",
        user: "Jackson Lee",
        email: "jackson.lee@email.com",
        amount: "+$39.00",
        status: "success",
      },
      {
        id: "3",
        user: "Isabella Nguyen",
        email: "isabella.nguyen@email.com",
        amount: "+$299.00",
        status: "pending",
      },
      {
        id: "4",
        user: "William Kim",
        email: "will@email.com",
        amount: "+$99.00",
        status: "success",
      },
      {
        id: "5",
        user: "Sofia Davis",
        email: "sofia.davis@email.com",
        amount: "+$39.00",
        status: "failed",
      },
    ],
    chartData: [
      { month: "Jan", value: 4200 },
      { month: "Feb", value: 3800 },
      { month: "Mar", value: 5200 },
      { month: "Apr", value: 4600 },
      { month: "May", value: 5800 },
      { month: "Jun", value: 6200 },
    ],
  },
  {
    id: "business-2",
    name: "E-Commerce Pro",
    metrics: {
      totalRevenue: 78450.25,
      revenueChange: 35.5,
      activeUsers: 4820,
      usersChange: 245.3,
      sales: 23456,
      salesChange: 28.7,
      activeNow: 892,
      activeNowChange: 156,
    },
    recentActivity: [
      {
        id: "1",
        user: "Emma Wilson",
        email: "emma.w@shop.com",
        amount: "+$2,499.00",
        status: "success",
      },
      {
        id: "2",
        user: "Liam Brown",
        email: "liam.b@shop.com",
        amount: "+$899.00",
        status: "success",
      },
      {
        id: "3",
        user: "Ava Johnson",
        email: "ava.j@shop.com",
        amount: "+$1,299.00",
        status: "success",
      },
      {
        id: "4",
        user: "Noah Davis",
        email: "noah.d@shop.com",
        amount: "+$599.00",
        status: "pending",
      },
      {
        id: "5",
        user: "Mia Garcia",
        email: "mia.g@shop.com",
        amount: "+$199.00",
        status: "success",
      },
    ],
    chartData: [
      { month: "Jan", value: 6500 },
      { month: "Feb", value: 7200 },
      { month: "Mar", value: 6800 },
      { month: "Apr", value: 8100 },
      { month: "May", value: 7900 },
      { month: "Jun", value: 8600 },
    ],
  },
  {
    id: "business-3",
    name: "Marketing Agency",
    metrics: {
      totalRevenue: 32150.50,
      revenueChange: 12.8,
      activeUsers: 1250,
      usersChange: 95.2,
      sales: 8934,
      salesChange: 15.3,
      activeNow: 324,
      activeNowChange: 78,
    },
    recentActivity: [
      {
        id: "1",
        user: "James Miller",
        email: "james@agency.com",
        amount: "+$3,500.00",
        status: "success",
      },
      {
        id: "2",
        user: "Charlotte Taylor",
        email: "charlotte@agency.com",
        amount: "+$1,200.00",
        status: "success",
      },
      {
        id: "3",
        user: "Benjamin Moore",
        email: "ben@agency.com",
        amount: "+$2,800.00",
        status: "pending",
      },
      {
        id: "4",
        user: "Amelia Anderson",
        email: "amelia@agency.com",
        amount: "+$950.00",
        status: "success",
      },
      {
        id: "5",
        user: "Lucas Thomas",
        email: "lucas@agency.com",
        amount: "+$1,500.00",
        status: "success",
      },
    ],
    chartData: [
      { month: "Jan", value: 3200 },
      { month: "Feb", value: 3600 },
      { month: "Mar", value: 3100 },
      { month: "Apr", value: 4200 },
      { month: "May", value: 3900 },
      { month: "Jun", value: 4500 },
    ],
  },
]
