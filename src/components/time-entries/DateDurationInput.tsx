import { useState } from 'react'
import { format, isToday, parseISO } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { DurationInput } from './DurationInput'

interface DateDurationInputProps {
  date: string
  duration: number
  onDateChange: (date: string) => void
  onDurationChange: (minutes: number) => void
}

export function DateDurationInput({
  date,
  duration,
  onDateChange,
  onDurationChange,
}: DateDurationInputProps) {
  const [calOpen, setCalOpen] = useState(false)
  const dateObj = parseISO(date)
  const dateLabel = isToday(dateObj) ? 'Today' : format(dateObj, 'd MMM')

  return (
    <div className="flex h-9 items-center overflow-hidden rounded-lg border border-input bg-background text-sm focus-within:ring-2 focus-within:ring-ring">
      <Popover open={calOpen} onOpenChange={setCalOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              tabIndex={-1}
              className="flex h-full w-1/2 items-center justify-center hover:bg-muted/50 focus:outline-none"
            />
          }
        >
          {dateLabel}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateObj}
            onSelect={(d) => {
              if (d) onDateChange(format(d, 'yyyy-MM-dd'))
              setCalOpen(false)
            }}
            weekStartsOn={1}
          />
        </PopoverContent>
      </Popover>

      <div className="h-full w-px bg-input" />

      <DurationInput
        value={duration}
        onChange={onDurationChange}
        placeholder="1:30"
        className="h-full w-1/2 rounded-none border-0 text-center focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  )
}
