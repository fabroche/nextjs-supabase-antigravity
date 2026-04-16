"use client"

import { DateRangePicker } from "@/components/reports/date-range-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ExecutionFilters } from "@/lib/supabase/types"

interface ExecutionFiltersProps {
  filters: ExecutionFilters
  onFiltersChange: (filters: ExecutionFilters) => void
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "success", label: "Exitosas" },
  { value: "error", label: "Con error" },
  { value: "warning", label: "Advertencia" },
  { value: "running", label: "En ejecución" },
]

export function ExecutionFiltersBar({ filters, onFiltersChange }: ExecutionFiltersProps) {
  function handleDateRange(from: Date, to: Date) {
    onFiltersChange({ ...filters, from, to })
  }

  function handleStatusChange(value: string) {
    const status =
      value === "all"
        ? undefined
        : (value as ExecutionFilters["status"])
    onFiltersChange({ ...filters, status })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <DateRangePicker onDateRangeChange={handleDateRange} />
      <Select
        value={filters.status ?? "all"}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
