import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function CardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="h-4 w-24 bg-muted rounded animate-pulse mb-3" />
        <div className="h-8 w-32 bg-muted rounded animate-pulse mb-2" />
        <div className="h-3 w-40 bg-muted rounded animate-pulse" />
      </CardContent>
    </Card>
  )
}

export default function WorkflowDetailLoading() {
  return (
    <DashboardLayout>
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Chart */}
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>

      {/* Filters + table */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-9 w-44" />
        </div>
        <Card>
          <CardContent className="p-0">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
