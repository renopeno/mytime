"use client"

import * as React from "react"
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
  subYears,
  format,
  isEqual,
  addMonths,
  isBefore,
  isAfter,
} from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useIsMobile } from "@/hooks/use-mobile"

export interface DateRange {
  from: Date
  to: Date
}

export interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

interface Preset {
  label: string
  getRange: () => DateRange
}

function getPresets(): Preset[] {
  const now = new Date()
  return [
    {
      label: "Today",
      getRange: () => ({
        from: startOfDay(now),
        to: endOfDay(now),
      }),
    },
    {
      label: "This Week",
      getRange: () => ({
        from: startOfWeek(now, { weekStartsOn: 1 }),
        to: endOfWeek(now, { weekStartsOn: 1 }),
      }),
    },
    {
      label: "Last Week",
      getRange: () => {
        const lastWeek = subWeeks(now, 1)
        return {
          from: startOfWeek(lastWeek, { weekStartsOn: 1 }),
          to: endOfWeek(lastWeek, { weekStartsOn: 1 }),
        }
      },
    },
    {
      label: "This Month",
      getRange: () => ({
        from: startOfMonth(now),
        to: endOfMonth(now),
      }),
    },
    {
      label: "Last Month",
      getRange: () => {
        const lastMonth = subMonths(now, 1)
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        }
      },
    },
    {
      label: "This Year",
      getRange: () => ({
        from: startOfYear(now),
        to: endOfYear(now),
      }),
    },
    {
      label: "Last Year",
      getRange: () => {
        const lastYear = subYears(now, 1)
        return {
          from: startOfYear(lastYear),
          to: endOfYear(lastYear),
        }
      },
    },
    {
      label: "All Time",
      getRange: () => ({
        from: new Date(2000, 0, 1),
        to: endOfDay(now),
      }),
    },
  ]
}

function getMatchingPresetLabel(range: DateRange): string | null {
  const presets = getPresets()
  for (const preset of presets) {
    const presetRange = preset.getRange()
    if (
      isEqual(startOfDay(range.from), startOfDay(presetRange.from)) &&
      isEqual(startOfDay(range.to), startOfDay(presetRange.to))
    ) {
      return preset.label
    }
  }
  return null
}

function formatRangeLabel(range: DateRange): string {
  const presetLabel = getMatchingPresetLabel(range)
  if (presetLabel) return presetLabel

  const fromYear = range.from.getFullYear()
  const toYear = range.to.getFullYear()
  const sameYear = fromYear === toYear

  if (sameYear) {
    return `${format(range.from, "MMM d")} \u2013 ${format(range.to, "MMM d, yyyy")}`
  }
  return `${format(range.from, "MMM d, yyyy")} \u2013 ${format(range.to, "MMM d, yyyy")}`
}

function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(false)
  const [selectionStart, setSelectionStart] = React.useState<Date | null>(null)
  const [hoverDate, setHoverDate] = React.useState<Date | null>(null)

  // Left calendar month state — defaults to the month of `value.from`
  const [leftMonth, setLeftMonth] = React.useState<Date>(
    startOfMonth(value.from)
  )
  const rightMonth = addMonths(leftMonth, 1)

  // Reset internal state when popover opens
  React.useEffect(() => {
    if (open) {
      setSelectionStart(null)
      setHoverDate(null)
      setLeftMonth(startOfMonth(value.from))
    }
  }, [open, value.from])

  const presets = React.useMemo(() => getPresets(), [])

  function handlePresetClick(preset: Preset) {
    onChange(preset.getRange())
    setOpen(false)
  }

  function handleDayClick(day: Date) {
    if (!selectionStart) {
      // First click — set start
      setSelectionStart(day)
      setHoverDate(null)
    } else {
      // Second click — set end and close
      const from = isBefore(day, selectionStart) ? day : selectionStart
      const to = isAfter(day, selectionStart) ? day : selectionStart
      onChange({ from: startOfDay(from), to: endOfDay(to) })
      setSelectionStart(null)
      setHoverDate(null)
      setOpen(false)
    }
  }

  function handleDayHover(day: Date) {
    if (selectionStart) {
      setHoverDate(day)
    }
  }

  // Build the visual selected range for the calendars
  const selectedRange = React.useMemo(() => {
    if (selectionStart && hoverDate) {
      const from = isBefore(hoverDate, selectionStart)
        ? hoverDate
        : selectionStart
      const to = isAfter(hoverDate, selectionStart)
        ? hoverDate
        : selectionStart
      return { from, to }
    }
    if (selectionStart) {
      return { from: selectionStart, to: selectionStart }
    }
    return { from: value.from, to: value.to }
  }, [selectionStart, hoverDate, value])

  const calendarProps = {
    mode: "range" as const,
    weekStartsOn: 1 as const,
    selected: { from: selectedRange.from, to: selectedRange.to },
    showOutsideDays: true,
    fixedWeeks: true,
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" className={cn("justify-start gap-2 font-normal", className)} />
        }
      >
        <CalendarIcon className="size-4 text-muted-foreground" />
        <span>{formatRangeLabel(value)}</span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          "w-auto p-0",
          isMobile ? "flex flex-col max-h-[80vh] overflow-y-auto" : "flex flex-row"
        )}
      >
        {/* Presets panel — top on mobile, left on desktop */}
        <div
          className={cn(
            "flex gap-0.5 p-2",
            isMobile
              ? "flex-row flex-wrap border-b border-border"
              : "flex-col border-r border-border min-w-[140px]"
          )}
        >
          {!isMobile && (
            <p className="px-2 pt-1 pb-2 text-xs font-medium text-muted-foreground select-none">
              Quick select
            </p>
          )}
          {presets.map((preset) => {
            const isActive = getMatchingPresetLabel(value) === preset.label && !selectionStart
            return (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  "rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted whitespace-nowrap",
                  isActive && "bg-muted font-medium"
                )}
              >
                {preset.label}
              </button>
            )
          })}
        </div>

        {/* Calendars — single on mobile, two side-by-side on desktop */}
        <div className={cn("flex p-2 gap-2", isMobile ? "flex-col" : "flex-row")}>
          <Calendar
            {...calendarProps}
            month={leftMonth}
            onMonthChange={setLeftMonth}
            onDayClick={handleDayClick}
            onDayMouseEnter={handleDayHover}
            captionLayout="label"
            hideNavigation={false}
            disableNavigation={false}
          />
          {!isMobile && (
            <Calendar
              {...calendarProps}
              month={rightMonth}
              onMonthChange={(m) => setLeftMonth(addMonths(m, -1))}
              onDayClick={handleDayClick}
              onDayMouseEnter={handleDayHover}
              captionLayout="label"
              hideNavigation={false}
              disableNavigation={false}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DateRangePicker, formatRangeLabel, getMatchingPresetLabel }
