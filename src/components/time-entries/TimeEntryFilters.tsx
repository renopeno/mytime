import { useState } from 'react'
import {
  format,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear,
  subWeeks, subMonths, subYears,
} from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { CalendarIcon, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { ProjectSelect } from '@/components/projects/ProjectSelect'
import { cn } from '@/lib/utils'

type DatePreset = 'this_week' | 'this_month' | 'last_week' | 'last_month' | 'this_year' | 'last_year' | 'custom' | ''

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'this_week',  label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_week',  label: 'Last week' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_year',  label: 'This year' },
  { value: 'last_year',  label: 'Last year' },
  { value: 'custom',     label: 'Custom...' },
]

interface TimeEntryFiltersProps {
  startDate: Date | undefined
  endDate: Date | undefined
  projectId: string
  onStartDateChange: (date: Date | undefined) => void
  onEndDateChange: (date: Date | undefined) => void
  onProjectChange: (projectId: string) => void
  onClear: () => void
}

export function TimeEntryFilters({
  startDate,
  endDate,
  projectId,
  onStartDateChange,
  onEndDateChange,
  onProjectChange,
  onClear,
}: TimeEntryFiltersProps) {
  const [datePreset, setDatePreset] = useState<DatePreset>('')
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined)

  function applyPreset(preset: DatePreset) {
    const now = new Date()
    setDatePreset(preset)
    if (preset === 'custom') return
    setCustomRange(undefined)
    switch (preset) {
      case 'this_week':
        onStartDateChange(startOfWeek(now, { weekStartsOn: 1 }))
        onEndDateChange(endOfWeek(now, { weekStartsOn: 1 }))
        break
      case 'this_month':
        onStartDateChange(startOfMonth(now))
        onEndDateChange(endOfMonth(now))
        break
      case 'last_week': {
        const lw = subWeeks(now, 1)
        onStartDateChange(startOfWeek(lw, { weekStartsOn: 1 }))
        onEndDateChange(endOfWeek(lw, { weekStartsOn: 1 }))
        break
      }
      case 'last_month': {
        const lm = subMonths(now, 1)
        onStartDateChange(startOfMonth(lm))
        onEndDateChange(endOfMonth(lm))
        break
      }
      case 'this_year':
        onStartDateChange(startOfYear(now))
        onEndDateChange(endOfYear(now))
        break
      case 'last_year': {
        const ly = subYears(now, 1)
        onStartDateChange(startOfYear(ly))
        onEndDateChange(endOfYear(ly))
        break
      }
    }
    setDatePickerOpen(false)
  }

  function handleCustomRangeSelect(range: DateRange | undefined) {
    setCustomRange(range)
    onStartDateChange(range?.from)
    const hasFullRange =
      range?.from &&
      range?.to &&
      format(range.from, 'yyyy-MM-dd') !== format(range.to, 'yyyy-MM-dd')
    if (hasFullRange) {
      onEndDateChange(range!.to)
      setDatePickerOpen(false)
    } else {
      onEndDateChange(undefined)
    }
  }

  function getDateLabel(): string | null {
    if (!datePreset) return null
    if (datePreset === 'custom' && startDate && endDate) {
      return `${format(startDate, 'dd.MM.yy')} – ${format(endDate, 'dd.MM.yy')}`
    }
    return DATE_PRESETS.find((p) => p.value === datePreset)?.label ?? null
  }

  function handleClear() {
    setDatePreset('')
    setCustomRange(undefined)
    onClear()
  }

  const hasFilters = !!(startDate || endDate || projectId)

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date range picker */}
      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className={cn(
                'justify-start text-left font-normal',
                !datePreset && 'text-muted-foreground'
              )}
            />
          }
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {getDateLabel() ?? 'Choose date'}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {datePreset !== 'custom' ? (
            <div className="flex min-w-[160px] flex-col py-1">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => applyPreset(p.value)}
                  className={cn(
                    'flex items-center justify-between px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted',
                    datePreset === p.value && 'font-medium'
                  )}
                >
                  {p.label}
                  {p.value === 'custom' && (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col">
              <button
                onClick={() => setDatePreset('')}
                className="flex items-center gap-1 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronRight className="h-3 w-3 rotate-180" />
                Back
              </button>
              <Calendar
                mode="range"
                numberOfMonths={2}
                selected={customRange}
                onSelect={handleCustomRangeSelect}
                weekStartsOn={1}
              />
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Project filter */}
      <div className="w-[200px]">
        <ProjectSelect
          value={projectId}
          onValueChange={onProjectChange}
          placeholder="All projects"
        />
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={handleClear}>
          Clear filters
        </Button>
      )}
    </div>
  )
}
