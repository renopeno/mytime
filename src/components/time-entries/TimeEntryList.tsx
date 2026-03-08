import { useMemo, useState, Fragment } from 'react'
import { parseISO, format } from 'date-fns'
import { Plus } from 'lucide-react'
import { formatDuration } from '@/lib/duration'
import { formatCurrency } from '@/lib/format'
import { resolveHourlyRate } from '@/lib/rate'
import { Separator } from '@/components/ui/separator'
import { useSettings } from '@/hooks/useSettings'
import { TimeEntryRow } from './TimeEntryRow'
import { InlineEntryForm } from './InlineEntryForm'
import type { TimeEntryWithProject } from '@/types/app.types'

/** Pre-compute dot positions for a ring of N dots */
function dotPositions(count: number, cx: number, cy: number, ringR: number) {
  const positions: { x: number; y: number }[] = []
  for (let i = 0; i < count; i++) {
    const angle = ((i * 360) / count - 90) * (Math.PI / 180)
    positions.push({
      x: cx + ringR * Math.cos(angle),
      y: cy + ringR * Math.sin(angle),
    })
  }
  return positions
}

interface TimeEntryListProps {
  entries: TimeEntryWithProject[]
  onDelete: (id: string) => void
  onDuplicate: (entry: TimeEntryWithProject) => void
  onUpdate: (id: string, updates: {
    project_id?: string | null
    description?: string
    duration_minutes?: number
    is_paid?: boolean
    is_invoiced?: boolean
  }) => Promise<{ error?: unknown }>
  onAdd?: (entry: {
    date: string
    project_id: string | null
    description: string
    duration_minutes: number
  }) => Promise<{ error?: unknown }>
}

export function TimeEntryList({ entries, onDelete, onDuplicate, onUpdate, onAdd }: TimeEntryListProps) {
  const [addingForDate, setAddingForDate] = useState<string | null>(null)
  const { settings } = useSettings()
  const dailyTarget = settings?.daily_hours_target ?? 8
  const grouped = useMemo(() => {
    const groups = new Map<string, TimeEntryWithProject[]>()
    for (const entry of entries) {
      const existing = groups.get(entry.date) ?? []
      groups.set(entry.date, [...existing, entry])
    }
    return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [entries])

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">No time entries yet.</p>
        <p className="text-sm text-muted-foreground">Add your first entry above.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {grouped.map(([date, dayEntries]) => {
        const total = dayEntries.reduce((sum, e) => sum + e.duration_minutes, 0)
        const totalAmount = dayEntries.reduce((sum, e) => {
          const rate = resolveHourlyRate(e.project, e.project?.client, settings)
          return sum + rate * (e.duration_minutes / 60)
        }, 0)
        return (
          <div key={date} className="rounded-lg border">
            {/* Date header */}
            <div className="group relative flex items-center gap-3 rounded-t-lg border-b bg-muted/50 px-3 py-3">
              <span className="font-serif text-sm font-semibold">
                {format(parseISO(date), 'EEEE, d. MMMM yyyy')}
              </span>
              {onAdd && (
                <button
                  type="button"
                  onClick={() => setAddingForDate(addingForDate === date ? null : date)}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
              <div className="flex-1" />
              <span className="w-14 shrink-0 text-right text-sm text-muted-foreground">
                {formatDuration(total)}
              </span>
              <span className="w-20 shrink-0 text-right text-sm text-muted-foreground/60">
                {formatCurrency(totalAmount)}
              </span>
              {/* Spacer matching row actions width */}
              <div className="w-[84px] shrink-0" />
              {/* Dot-ring daily progress */}
              <svg
                width="18" height="18" viewBox="0 0 18 18"
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                {(() => {
                  const hours = total / 60
                  const isOvertime = hours > dailyTarget
                  const dots = dotPositions(dailyTarget, 9, 9, 5.5)
                  const dotR = dailyTarget <= 10 ? 1.5 : 1.2
                  return dots.map((pos, i) => {
                    const filled = hours >= i + 1
                    const partial = !filled && hours > i
                    const opacity = partial ? hours - i : 1
                    let fill = '#c8c8c8' // empty
                    if (filled || partial) {
                      fill = isOvertime ? '#ef4444' : '#22c55e'
                    }
                    return (
                      <circle
                        key={i}
                        cx={pos.x}
                        cy={pos.y}
                        r={dotR}
                        fill={fill}
                        opacity={filled || partial ? opacity : 1}
                      />
                    )
                  })
                })()}
              </svg>
            </div>
            {/* Entries */}
            <div className="px-2 py-1">
              {dayEntries.map((entry, i) => (
                <Fragment key={entry.id}>
                  {i > 0 && <Separator className="my-[2px]" />}
                  <TimeEntryRow
                    entry={entry}
                    settings={settings}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    onUpdate={onUpdate}
                  />
                </Fragment>
              ))}
              {addingForDate === date && onAdd && (
                <>
                  {dayEntries.length > 0 && <Separator className="my-[2px]" />}
                  <InlineEntryForm
                    date={date}
                    onSubmit={onAdd}
                    onCancel={() => setAddingForDate(null)}
                  />
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
