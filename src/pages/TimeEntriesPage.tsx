import { useState, useMemo, useRef, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { toast } from 'sonner'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { useSettings } from '@/hooks/useSettings'
import { TimeEntryList } from '@/components/time-entries/TimeEntryList'
import { QuickEntryForm } from '@/components/time-entries/QuickEntryForm'
import { formatDuration } from '@/lib/duration'
import { formatCurrency } from '@/lib/format'
import { resolveHourlyRate } from '@/lib/rate'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import type { TimeEntryWithProject } from '@/types/app.types'

const PAGE_SIZE = 100

function weeklyTarget(dailyHours: number) {
  return dailyHours * 5 * 60 // 5 working days in minutes
}

function earnedForEntries(
  entries: TimeEntryWithProject[],
  settings: { default_hourly_rate: number } | null | undefined
) {
  let total = 0
  for (const entry of entries) {
    const rate = resolveHourlyRate(entry.project, entry.project?.client, settings)
    total += (entry.duration_minutes / 60) * rate
  }
  return total
}

function ComparisonBadge({ current, previous, formatter, label = 'vs last week' }: {
  current: number
  previous: number
  formatter: (v: number) => string
  label?: string
}) {
  if (previous === 0) return null
  const diff = current - previous
  const isUp = diff >= 0
  return (
    <span className={`text-[11px] ${isUp ? 'text-emerald-600' : 'text-orange-500'}`}>
      {isUp ? '+' : '-'}{formatter(Math.abs(diff))} {label}
    </span>
  )
}

export default function TimeEntriesPage() {
  const [quickDate, setQuickDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const { settings } = useSettings()
  const WEEKLY_TARGET = weeklyTarget(settings?.daily_hours_target ?? 8)

  // Measure sticky form height so the rounded cap sticks right below it
  const stickyFormRef = useRef<HTMLDivElement>(null)
  const [formHeight, setFormHeight] = useState(0)
  useEffect(() => {
    const el = stickyFormRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setFormHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { entries: allEntries, loading, createEntry, updateEntry, deleteEntry, duplicateEntry } = useTimeEntries({})
  const entries = useMemo(() => allEntries.slice(0, visibleCount), [allEntries, visibleCount])
  const hasMore = allEntries.length > visibleCount

  // ── KPI data (always current week / month, never affected by filters) ──
  const now = new Date()

  // Current week
  const thisWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const thisWeekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const { entries: thisWeekEntries } = useTimeEntries({ startDate: thisWeekStart, endDate: thisWeekEnd })

  // Last week (comparison)
  const lastWeekStart = format(startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const lastWeekEnd = format(endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const { entries: lastWeekEntries } = useTimeEntries({ startDate: lastWeekStart, endDate: lastWeekEnd })

  // Current month
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
  const { entries: monthEntries } = useTimeEntries({ startDate: monthStart, endDate: monthEnd })

  // Last month (comparison)
  const lastMonth = subMonths(now, 1)
  const lastMonthStart = format(startOfMonth(lastMonth), 'yyyy-MM-dd')
  const lastMonthEnd = format(endOfMonth(lastMonth), 'yyyy-MM-dd')
  const { entries: lastMonthEntries } = useTimeEntries({ startDate: lastMonthStart, endDate: lastMonthEnd })

  // KPI values — always based on fixed date ranges
  const weekMinutes = useMemo(
    () => thisWeekEntries.reduce((sum, e) => sum + e.duration_minutes, 0),
    [thisWeekEntries]
  )
  const weekEarned = useMemo(
    () => earnedForEntries(thisWeekEntries, settings),
    [thisWeekEntries, settings]
  )
  const lastWeekMinutes = useMemo(
    () => lastWeekEntries.reduce((sum, e) => sum + e.duration_minutes, 0),
    [lastWeekEntries]
  )
  const lastWeekEarned = useMemo(
    () => earnedForEntries(lastWeekEntries, settings),
    [lastWeekEntries, settings]
  )
  const monthlyEarned = useMemo(
    () => earnedForEntries(monthEntries, settings),
    [monthEntries, settings]
  )
  const lastMonthEarned = useMemo(
    () => earnedForEntries(lastMonthEntries, settings),
    [lastMonthEntries, settings]
  )

  const projectBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; color: string; minutes: number; earned: number }>()
    for (const e of thisWeekEntries) {
      if (e.project_id && e.project) {
        const rate = resolveHourlyRate(e.project, e.project.client, settings)
        const amount = (e.duration_minutes / 60) * rate
        const existing = map.get(e.project_id)
        if (existing) {
          existing.minutes += e.duration_minutes
          existing.earned += amount
        } else {
          map.set(e.project_id, { name: e.project.name, color: e.project.client?.color ?? '#6789b9', minutes: e.duration_minutes, earned: amount })
        }
      }
    }
    return [...map.values()].sort((a, b) => b.minutes - a.minutes)
  }, [thisWeekEntries, settings])

  async function handleDelete(id: string) {
    const { error } = await deleteEntry(id)
    if (error) toast.error('Failed to delete entry')
    else toast.success('Entry deleted')
  }

  async function handleDuplicate(entry: TimeEntryWithProject) {
    const { error } = await duplicateEntry(entry)
    if (error) toast.error('Failed to duplicate entry')
    else toast.success('Entry duplicated')
  }

  async function handleUpdate(id: string, updates: {
    project_id?: string | null
    description?: string
    duration_minutes?: number
    is_paid?: boolean
    is_invoiced?: boolean
  }) {
    const { error } = await updateEntry(id, updates)
    if (error) toast.error('Failed to update entry')
    return { error }
  }

  async function handleAdd(entry: {
    date: string
    project_id: string | null
    description: string
    duration_minutes: number
  }) {
    const { error } = await createEntry(entry)
    if (error) toast.error('Failed to add entry')
    return { error }
  }

  return (
    <div>

      {/* Sticky zone — quick entry form only */}
      <div ref={stickyFormRef} className="sticky top-0 z-20 bg-muted">
        <div className="px-5 md:px-6 pt-6 pb-5">
          <QuickEntryForm
            onSubmit={createEntry}
            date={quickDate}
            onDateChange={setQuickDate}
          />
        </div>
      </div>

      {/* Scrollable: progress bar + KPIs */}
      <div className="bg-muted">
        <div className="px-5 md:px-6">
          {/* Weekly progress bar — project-colored, full width */}
          <div className="h-[3px] overflow-hidden rounded-full bg-sidebar-accent">
            {projectBreakdown.length > 0 ? (
              <div className="flex h-full">
                <TooltipProvider>
                  {projectBreakdown.map((p) => {
                    const pct = Math.round((p.minutes / WEEKLY_TARGET) * 100)
                    return (
                      <Tooltip key={p.name}>
                        <TooltipTrigger
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(pct, 100)}%`,
                            backgroundColor: p.color,
                          }}
                        />
                        <TooltipContent>
                          {p.name} — {formatDuration(p.minutes)} / {pct}%
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </TooltipProvider>
              </div>
            ) : (
              <div
                className="h-full rounded-full bg-foreground/30 transition-all"
                style={{ width: `${Math.min(weekMinutes / WEEKLY_TARGET, 1) * 100}%` }}
              />
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Time this week */}
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">Time this week</p>
              <div className="flex items-baseline gap-2">
                <p className="font-serif text-xl font-normal">{formatDuration(weekMinutes)}</p>
                <ComparisonBadge
                  current={weekMinutes}
                  previous={lastWeekMinutes}
                  formatter={(v) => formatDuration(v)}
                />
              </div>
            </div>

            {/* Earned this week */}
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">Earned this week</p>
              <div className="flex items-baseline gap-2">
                <p className="font-serif text-xl font-normal">{formatCurrency(weekEarned)}</p>
                <ComparisonBadge
                  current={weekEarned}
                  previous={lastWeekEarned}
                  formatter={(v) => formatCurrency(v)}
                />
              </div>
            </div>

            {/* Earned this month */}
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">Earned this month</p>
              <div className="flex items-baseline gap-2">
                <p className="font-serif text-xl font-normal">{formatCurrency(monthlyEarned)}</p>
                <ComparisonBadge
                  current={monthlyEarned}
                  previous={lastMonthEarned}
                  formatter={(v) => formatCurrency(v)}
                  label="vs last month"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="h-5" />
      </div>

      {/* Rounded white cap — sticky, sticks below form when KPIs scroll away.
           bg-muted wrapper ensures corner gaps show muted color when sticky. */}
      <div
        className="sticky z-10 bg-muted"
        style={{ top: formHeight > 0 ? `${formHeight}px` : undefined }}
      >
        <div className="h-[16px] bg-background rounded-t-[16px] shadow-[0px_-2px_12px_0px_rgba(0,0,0,0.02)]" />
      </div>

      {/* Scrollable content */}
      <div className="px-5 md:px-6 pb-5">
        <div className="mt-4">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <>
              <TimeEntryList
                entries={entries}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onUpdate={handleUpdate}
                onAdd={handleAdd}
              />
              {hasMore && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                  >
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

    </div>
  )
}
