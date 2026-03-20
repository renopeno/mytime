import { DateRangePicker } from '@/components/ui/date-range-picker'
import type { DateRange } from '@/components/ui/date-range-picker'

interface TimeEntryFiltersProps {
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
}

export function TimeEntryFilters({
  dateRange,
  onDateRangeChange,
}: TimeEntryFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
    </div>
  )
}
