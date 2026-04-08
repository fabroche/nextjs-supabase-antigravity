'use client'

import * as React from 'react'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DateRangePickerProps {
  onDateRangeChange: (from: Date, to: Date) => void
  className?: string
}

const PRESETS = [
  {
    label: 'Ultima semana',
    getRange: () => ({ from: subDays(new Date(), 7), to: new Date() }),
  },
  {
    label: 'Ultimo mes',
    getRange: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }),
  },
  {
    label: 'Ultimos 3 meses',
    getRange: () => ({ from: startOfMonth(subMonths(new Date(), 3)), to: new Date() }),
  },
]

export function DateRangePicker({ onDateRangeChange, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [range, setRange] = React.useState<DateRange | undefined>()

  function handleSelect(selected: DateRange | undefined) {
    setRange(selected)
  }

  function handlePreset(getRange: () => { from: Date; to: Date }) {
    const { from, to } = getRange()
    setRange({ from, to })
  }

  function handleApply() {
    if (range?.from && range?.to) {
      onDateRangeChange(range.from, range.to)
      setOpen(false)
    }
  }

  const label =
    range?.from && range?.to
      ? `${format(range.from, 'dd MMM yyyy', { locale: es })} – ${format(range.to, 'dd MMM yyyy', { locale: es })}`
      : 'Seleccionar rango de fechas'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('w-[300px] justify-start text-left font-normal', !range && 'text-muted-foreground', className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Presets */}
          <div className="flex flex-col gap-1 border-r p-3">
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="justify-start text-sm"
                onClick={() => handlePreset(preset.getRange)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Calendar */}
          <div>
            <Calendar
              mode="range"
              selected={range}
              onSelect={handleSelect}
              numberOfMonths={2}
              locale={es}
              disabled={{ after: new Date() }}
            />
            <div className="border-t p-3 flex justify-end">
              <Button size="sm" disabled={!range?.from || !range?.to} onClick={handleApply}>
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
