import { useState, useMemo } from 'react'
import { startOfMonth, endOfMonth, parseISO, format } from 'date-fns'
import { toast } from 'sonner'
import { FileText, ArrowLeftRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useIsMobile } from '@/hooks/use-mobile'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import type { DateRange } from '@/components/ui/date-range-picker'
import { useDashboardData } from '@/hooks/useDashboardData'
import type { DashboardFilters, DashboardData } from '@/hooks/useDashboardData'
import { useProjects } from '@/hooks/useProjects'
import { useClients } from '@/hooks/useClients'
import { formatCurrency } from '@/lib/format'
import { getGroupingMode, groupEntries } from '@/lib/chart-utils'
import type { GroupedDataPoint } from '@/lib/chart-utils'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#3b82f6', '#84cc16',
]

function getColor(color: string | undefined, index: number): string {
  return color && color !== '' ? color : DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

type BillingStatusValue = 'not_paid' | 'invoice_sent' | 'paid'
type TrendMetric = 'hours' | 'earnings'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatHoursMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

function computeDelta(current: number, compare: number): string | null {
  if (compare === 0) {
    if (current === 0) return null
    return '+100%'
  }
  const pct = ((current - compare) / compare) * 100
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${Math.round(pct)}%`
}

function deltaColorClass(delta: string | null): string {
  if (!delta) return 'text-muted-foreground'
  if (delta.startsWith('+')) return 'text-emerald-600'
  if (delta.startsWith('-')) return 'text-red-500'
  return 'text-muted-foreground'
}

// ─── Segment Control ────────────────────────────────────────────────────────

function SegmentControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-md border border-border">
      {options.map((opt) => (
        <Button
          key={opt.value}
          variant={value === opt.value ? 'default' : 'ghost'}
          size="sm"
          className="rounded-none first:rounded-l-md last:rounded-r-md"
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  )
}

// ─── Multi-Select Filter ────────────────────────────────────────────────────

function MultiSelectFilter({
  label,
  items,
  selectedIds,
  onSelectionChange,
}: {
  label: string
  items: Array<{ id: string; name: string; color?: string }>
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}) {
  const selectedSet = new Set(selectedIds)
  const displayLabel =
    selectedIds.length === 0
      ? `All ${label}`
      : selectedIds.length === 1
        ? items.find((i) => i.id === selectedIds[0])?.name ?? `1 ${label.slice(0, -1)}`
        : `${selectedIds.length} ${label}`

  function toggle(id: string) {
    if (selectedSet.has(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5 font-normal" />
        }
      >
        <span className="truncate max-w-[140px]">{displayLabel}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        {items.length === 0 ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">No items</div>
        ) : (
          <div className="max-h-[240px] overflow-y-auto">
            {items.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted cursor-pointer"
              >
                <Checkbox
                  checked={selectedSet.has(item.id)}
                  onCheckedChange={() => toggle(item.id)}
                />
                {item.color && (
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                <span className="truncate">{item.name}</span>
              </label>
            ))}
          </div>
        )}
        {selectedIds.length > 0 && (
          <div className="border-t border-border pt-1 mt-1">
            <button
              className="w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted"
              onClick={() => onSelectionChange([])}
            >
              Clear selection
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ─── KPI Cards ──────────────────────────────────────────────────────────────

function KPICards({
  data,
  compareData,
  loading,
  compareLoading,
  compareMode,
}: {
  data: DashboardData
  compareData: DashboardData | null
  loading: boolean
  compareLoading: boolean
  compareMode: boolean
}) {
  const { totalMinutes, totalAmount, workingDays } = data

  const minutesDelta = compareMode && compareData ? computeDelta(totalMinutes, compareData.totalMinutes) : null
  const amountDelta = compareMode && compareData ? computeDelta(totalAmount, compareData.totalAmount) : null
  const daysDelta = compareMode && compareData ? computeDelta(workingDays, compareData.workingDays) : null

  const avgHourlyRate = totalMinutes > 0 ? totalAmount / (totalMinutes / 60) : 0
  const compareAvgHourlyRate = compareMode && compareData && compareData.totalMinutes > 0
    ? compareData.totalAmount / (compareData.totalMinutes / 60)
    : 0
  const rateDelta = compareMode && compareData ? computeDelta(avgHourlyRate, compareAvgHourlyRate) : null

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="flex items-baseline gap-2">
              <p className="font-serif text-2xl font-bold">{formatHoursMinutes(totalMinutes)}</p>
              {compareMode && !compareLoading && minutesDelta && (
                <span className={`text-sm font-medium ${deltaColorClass(minutesDelta)}`}>{minutesDelta}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="flex items-baseline gap-2">
              <p className="font-serif text-2xl font-bold">{formatCurrency(totalAmount)}</p>
              {compareMode && !compareLoading && amountDelta && (
                <span className={`text-sm font-medium ${deltaColorClass(amountDelta)}`}>{amountDelta}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Working Days</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="flex items-baseline gap-2">
              <p className="font-serif text-2xl font-bold">{workingDays}</p>
              {compareMode && !compareLoading && daysDelta && (
                <span className={`text-sm font-medium ${deltaColorClass(daysDelta)}`}>{daysDelta}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Avg Hourly Rate</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="flex items-baseline gap-2">
              <p className="font-serif text-2xl font-bold">{formatCurrency(avgHourlyRate)}</p>
              {compareMode && !compareLoading && rateDelta && (
                <span className={`text-sm font-medium ${deltaColorClass(rateDelta)}`}>{rateDelta}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Layered Ring Chart (SVG) ────────────────────────────────────────────────

function LayeredRingChart({
  segments,
  size = 220,
  strokeWidth = 30,
  centerLabel,
  centerValue,
  activeIndex,
  onSegmentHover,
  onSegmentClick,
}: {
  segments: Array<{ name: string; value: number; color: string }>
  size?: number
  strokeWidth?: number
  centerLabel?: string
  centerValue?: string
  activeIndex?: number | null
  onSegmentHover?: (index: number | null) => void
  onSegmentClick?: (index: number) => void
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const cx = size / 2
  const cy = size / 2
  const gapAngleDeg = 3
  const gapFraction = gapAngleDeg / 360

  if (total === 0) return null

  // Build arcs: each segment gets a fraction of the circumference, minus gap
  let cumulativeOffset = 0
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((seg, i) => {
      const fraction = seg.value / total
      const arcLength = Math.max(0, (fraction - gapFraction) * circumference)
      const offset = cumulativeOffset
      cumulativeOffset += fraction * circumference
      return {
        ...seg,
        index: i,
        arcLength,
        dashOffset: -offset - (gapFraction / 2) * circumference,
      }
    })

  const isInteractive = onSegmentHover || onSegmentClick

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      onMouseLeave={() => onSegmentHover?.(null)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-muted/40"
          strokeWidth={strokeWidth * 0.6}
        />
        {/* Segment arcs — each subsequent segment overlaps the previous one */}
        {arcs.map((arc) => (
          <circle
            key={arc.name}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arc.arcLength} ${circumference - arc.arcLength}`}
            strokeDashoffset={arc.dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            opacity={activeIndex != null && activeIndex !== arc.index ? 0.35 : 1}
            className={isInteractive ? 'cursor-pointer transition-opacity duration-200' : 'transition-opacity duration-200'}
            onMouseEnter={() => onSegmentHover?.(arc.index)}
            onClick={() => onSegmentClick?.(arc.index)}
          />
        ))}
      </svg>
      {/* Center text */}
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerLabel && <span className="text-xs text-muted-foreground transition-all duration-200">{centerLabel}</span>}
          {centerValue && <span className="font-serif text-lg font-bold transition-all duration-200">{centerValue}</span>}
        </div>
      )}
    </div>
  )
}

// ─── Billing Ring Chart ─────────────────────────────────────────────────────

const BILLING_COLORS = {
  notPaid: '#e1d4c0',
  invoiceSent: '#fddd74',
  paid: '#45825d',
}

function BillingDonutChart({
  data,
  loading,
}: {
  data: DashboardData
  loading: boolean
}) {
  const { billingBreakdown } = data
  const total = billingBreakdown.notPaid + billingBreakdown.invoiceSent + billingBreakdown.paid

  const allStatuses = useMemo(() => [
    { name: 'Not Paid', value: Math.round(billingBreakdown.notPaid * 100) / 100, color: BILLING_COLORS.notPaid },
    { name: 'Invoice Sent', value: Math.round(billingBreakdown.invoiceSent * 100) / 100, color: BILLING_COLORS.invoiceSent },
    { name: 'Paid', value: Math.round(billingBreakdown.paid * 100) / 100, color: BILLING_COLORS.paid },
  ], [billingBreakdown])

  const segments = useMemo(() => allStatuses.filter(s => s.value > 0), [allStatuses])

  // Default selected: Not Paid (index 0 in allStatuses, find its index in segments)
  const defaultIndex = segments.findIndex(s => s.name === 'Not Paid')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(defaultIndex >= 0 ? defaultIndex : 0)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const activeIndex = hoveredIndex ?? selectedIndex
  const activeSegment = activeIndex != null ? segments[activeIndex] : null

  if (loading) return <Skeleton className="h-[350px] w-full" />

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Billing Status</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <NoData />
        ) : (
          <div className="flex items-center gap-8">
            <div className="shrink-0">
              <LayeredRingChart
                segments={segments}
                centerLabel={activeSegment?.name ?? 'Total'}
                centerValue={formatCurrency(activeSegment?.value ?? total)}
                activeIndex={activeIndex}
                onSegmentHover={setHoveredIndex}
                onSegmentClick={(i) => setSelectedIndex(i)}
              />
            </div>
            {/* Legend — with percentages, clickable */}
            <div className="flex flex-col gap-3">
              {allStatuses.map((item) => {
                const segIdx = segments.findIndex(s => s.name === item.name)
                const isActive = segIdx >= 0 && segIdx === activeIndex
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
                return (
                  <button
                    key={item.name}
                    className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors duration-150 hover:bg-muted/50 ${isActive ? 'bg-muted/50' : ''}`}
                    onMouseEnter={() => segIdx >= 0 && setHoveredIndex(segIdx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => segIdx >= 0 && setSelectedIndex(segIdx)}
                  >
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full transition-opacity duration-200"
                      style={{ backgroundColor: item.color, opacity: activeIndex != null && segIdx !== activeIndex ? 0.4 : 1 }}
                    />
                    <span className={`text-sm transition-colors duration-150 ${isActive ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {item.name}
                    </span>
                    <span className={`ml-auto text-sm tabular-nums transition-colors duration-150 ${isActive ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {pct}%
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Earnings Donut Chart (By Project / By Client) ──────────────────────────

const OTHER_THRESHOLD = 0.05

function EarningsDonutChart({
  data,
  loading,
}: {
  data: DashboardData
  loading: boolean
}) {
  const { segments, legendItems } = useMemo(() => {
    const items = data.byClient
    const sorted = [...items]
      .map((item, index) => {
        const color = 'color' in item ? getColor(item.color as string | undefined, index) : getColor(undefined, index)
        return {
          name: item.name,
          amount: Math.round(item.amount * 100) / 100,
          color,
        }
      })
      .sort((a, b) => b.amount - a.amount)

    const total = sorted.reduce((sum, s) => sum + s.amount, 0)
    if (total === 0) return { segments: [], legendItems: [] }

    const main: Array<{ name: string; value: number; color: string }> = []
    let otherAmount = 0
    const legend: Array<{ name: string; amount: number; color: string }> = []

    for (const item of sorted) {
      if (item.amount / total < OTHER_THRESHOLD && sorted.length > 3) {
        otherAmount += item.amount
      } else {
        main.push({ name: item.name, value: item.amount, color: item.color })
        legend.push({ name: item.name, amount: item.amount, color: item.color })
      }
    }

    if (otherAmount > 0) {
      main.push({ name: 'Other', value: Math.round(otherAmount * 100) / 100, color: '#a0a0a0' })
      legend.push({ name: 'Other', amount: Math.round(otherAmount * 100) / 100, color: '#a0a0a0' })
    }

    return { segments: main, legendItems: legend }
  }, [data.byClient])

  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const activeIndex = hoveredIndex ?? selectedIndex
  const activeSegment = activeIndex != null ? segments[activeIndex] : null

  if (loading) return <Skeleton className="h-[350px] w-full" />

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Earnings by Client</CardTitle>
      </CardHeader>
      <CardContent>
        {segments.length === 0 ? (
          <NoData />
        ) : (
          <div className="flex items-center gap-8">
            <div className="shrink-0">
              <LayeredRingChart
                segments={segments}
                centerLabel={activeSegment?.name ?? 'Total'}
                centerValue={formatCurrency(activeSegment?.value ?? total)}
                activeIndex={activeIndex}
                onSegmentHover={setHoveredIndex}
                onSegmentClick={(i) => setSelectedIndex(prev => prev === i ? null : i)}
              />
            </div>
            {/* Legend — with percentages, clickable */}
            <div className="flex flex-col gap-2 min-w-0 flex-1">
              {legendItems.map((item) => {
                const segIdx = segments.findIndex(s => s.name === item.name)
                const isActive = segIdx >= 0 && segIdx === activeIndex
                const pct = total > 0 ? Math.round((item.amount / total) * 100) : 0
                return (
                  <button
                    key={item.name}
                    className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors duration-150 hover:bg-muted/50 ${isActive ? 'bg-muted/50' : ''}`}
                    onMouseEnter={() => segIdx >= 0 && setHoveredIndex(segIdx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => segIdx >= 0 && setSelectedIndex(prev => prev === segIdx ? null : segIdx)}
                  >
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full transition-opacity duration-200"
                      style={{ backgroundColor: item.color, opacity: activeIndex != null && segIdx !== activeIndex ? 0.4 : 1 }}
                    />
                    <span className={`text-sm truncate transition-colors duration-150 ${isActive ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {item.name}
                    </span>
                    <span className={`ml-auto shrink-0 text-sm tabular-nums transition-colors duration-150 ${isActive ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {pct}%
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Trend Chart ────────────────────────────────────────────────────────────

function TrendChart({
  data,
  compareData,
  dateRange,
  compareDateRange,
  loading,
  compareMode,
}: {
  data: DashboardData
  compareData: DashboardData | null
  dateRange: DateRange
  compareDateRange: DateRange | null
  loading: boolean
  compareMode: boolean
}) {
  const [metric, setMetric] = useState<TrendMetric>('hours')

  const groupingMode = useMemo(() => getGroupingMode(dateRange.from, dateRange.to), [dateRange])

  const chartData = useMemo(() => {
    const grouped = groupEntries(data.entries, groupingMode)
    const result = grouped.map((point: GroupedDataPoint) => ({
      label: point.label,
      value: metric === 'hours' ? Math.round((point.minutes / 60) * 100) / 100 : Math.round(point.amount * 100) / 100,
    }))

    if (compareMode && compareData && compareDateRange) {
      const compareGroupingMode = getGroupingMode(compareDateRange.from, compareDateRange.to)
      const compareGrouped = groupEntries(compareData.entries, compareGroupingMode)
      // Align compare data by index
      for (let i = 0; i < result.length; i++) {
        const cp = compareGrouped[i]
        ;(result[i] as Record<string, unknown>).compareValue = cp
          ? metric === 'hours'
            ? Math.round((cp.minutes / 60) * 100) / 100
            : Math.round(cp.amount * 100) / 100
          : 0
      }
      // If compare has more points, add them
      for (let i = result.length; i < compareGrouped.length; i++) {
        const cp = compareGrouped[i]
        result.push({
          label: cp.label,
          value: 0,
          compareValue: metric === 'hours'
            ? Math.round((cp.minutes / 60) * 100) / 100
            : Math.round(cp.amount * 100) / 100,
        } as typeof result[number])
      }
    }

    return result
  }, [data.entries, compareData, compareDateRange, groupingMode, metric, compareMode])

  const unit = metric === 'hours' ? 'h' : ''
  const formatter = metric === 'hours'
    ? (v: number) => `${v}h`
    : (v: number) => formatCurrency(v)

  if (loading) return <Skeleton className="h-[350px] w-full" />

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base font-medium">Trend</CardTitle>
        <SegmentControl
          options={[
            { value: 'hours' as TrendMetric, label: 'Hours' },
            { value: 'earnings' as TrendMetric, label: 'Earnings' },
          ]}
          value={metric}
          onChange={setMetric}
        />
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <NoData />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis unit={unit} tickFormatter={metric === 'earnings' ? (v) => `${Math.round(v)}` : undefined} />
              <RechartsTooltip formatter={(value) => [formatter(Number(value)), '']} />
              <Area
                type="monotone"
                dataKey="value"
                name="Current"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#trendGradient)"
              />
              {compareMode && compareData && (
                <Area
                  type="monotone"
                  dataKey="compareValue"
                  name="Compare"
                  stroke="#6366f1"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fillOpacity={0}
                  fill="transparent"
                />
              )}
              {compareMode && compareData && <Legend />}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Shared ─────────────────────────────────────────────────────────────────

function NoData() {
  return <div className="flex h-[200px] items-center justify-center text-muted-foreground">No data for this period</div>
}

// ─── Time Entries Table ──────────────────────────────────────────────────

const ENTRIES_PAGE_SIZE = 20

function formatDurationHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}:${m.toString().padStart(2, '0')}`
}

function formatShortDate(dateStr: string): string {
  const d = parseISO(dateStr)
  return format(d, 'dd.MM.')
}

function TimeEntriesTable({
  data,
  loading,
}: {
  data: DashboardData
  loading: boolean
}) {
  const isMobile = useIsMobile()
  const [visibleCount, setVisibleCount] = useState(ENTRIES_PAGE_SIZE)

  const projectColorMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of data.byProject) {
      map.set(p.name, p.color)
    }
    return map
  }, [data.byProject])

  const sortedEntries = useMemo(
    () => [...data.entries].sort((a, b) => b.date.localeCompare(a.date)),
    [data.entries],
  )

  const visibleEntries = sortedEntries.slice(0, visibleCount)
  const hasMore = visibleCount < sortedEntries.length

  if (loading) return <Skeleton className="h-[200px] w-full" />

  if (sortedEntries.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h2 className="font-serif text-xl font-medium">Time Entries</h2>
        <span className="text-sm text-muted-foreground">({sortedEntries.length})</span>
      </div>

      <div className="rounded-lg border bg-card">
        {isMobile ? (
          <div className="divide-y divide-border">
            {visibleEntries.map((entry, i) => {
              const color = entry.projectName ? projectColorMap.get(entry.projectName) : undefined
              return (
                <div key={i} className="p-4 space-y-2 bg-white dark:bg-background">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {entry.projectName ? (
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          <span
                            className="inline-block h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: color || '#6366f1' }}
                          />
                          <span className="truncate">{entry.projectName}</span>
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">No project</span>
                      )}
                      <span className="text-xs text-muted-foreground">{formatShortDate(entry.date)}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="block text-sm font-semibold">{formatDurationHMM(entry.durationMinutes)}</span>
                      <span className="block text-xs text-muted-foreground/60">{formatCurrency(entry.amount)}</span>
                    </div>
                  </div>
                  {entry.description && (
                    <p className="text-sm text-muted-foreground truncate">{entry.description}</p>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[72px]">Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[72px] text-right">Duration</TableHead>
                <TableHead className="w-[96px] text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleEntries.map((entry, i) => {
                const color = entry.projectName ? projectColorMap.get(entry.projectName) : undefined
                return (
                  <TableRow key={i} className="bg-white dark:bg-background">
                    <TableCell className="text-sm text-muted-foreground">{formatShortDate(entry.date)}</TableCell>
                    <TableCell>
                      {entry.projectName ? (
                        <span className="flex items-center gap-1.5 text-sm">
                          <span
                            className="inline-block h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: color || '#6366f1' }}
                          />
                          <span className="truncate">{entry.projectName}</span>
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{entry.clientName ?? '-'}</TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm">{entry.description || <span className="italic text-muted-foreground">-</span>}</TableCell>
                    <TableCell className="text-right text-sm">{formatDurationHMM(entry.durationMinutes)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground/60">{formatCurrency(entry.amount)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount((c) => c + ENTRIES_PAGE_SIZE)}
          >
            Show more ({sortedEntries.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const now = new Date()

  // Date range
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(now),
    to: endOfMonth(now),
  })

  // Compare mode
  const [compareMode, setCompareMode] = useState(false)
  const [compareDateRange, setCompareDateRange] = useState<DateRange>({
    from: startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1)),
    to: endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1)),
  })

  // Filters
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [selectedBillingStatuses, setSelectedBillingStatuses] = useState<BillingStatusValue[]>([])

  // Data hooks
  const { projects } = useProjects()
  const { clients } = useClients()

  const filters: DashboardFilters = useMemo(() => ({
    from: dateRange.from,
    to: dateRange.to,
    projectIds: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
    clientIds: selectedClientIds.length > 0 ? selectedClientIds : undefined,
    billingStatuses: selectedBillingStatuses.length > 0 ? selectedBillingStatuses : undefined,
  }), [dateRange, selectedProjectIds, selectedClientIds, selectedBillingStatuses])

  const compareFilters: DashboardFilters = useMemo(() => ({
    from: compareDateRange.from,
    to: compareDateRange.to,
    projectIds: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
    clientIds: selectedClientIds.length > 0 ? selectedClientIds : undefined,
    billingStatuses: selectedBillingStatuses.length > 0 ? selectedBillingStatuses : undefined,
  }), [compareDateRange, selectedProjectIds, selectedClientIds, selectedBillingStatuses])

  const data = useDashboardData(filters)
  const compareData = useDashboardData(compareFilters)

  // Export PDF
  async function handleExportPDF() {
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { ReportPDF } = await import('@/lib/pdf-report')

      const selectedProjectNames = selectedProjectIds
        .map((id) => projects.find((p) => p.id === id)?.name)
        .filter(Boolean) as string[]
      const selectedClientNames = selectedClientIds
        .map((id) => clients.find((c) => c.id === id)?.name)
        .filter(Boolean) as string[]

      const pdfEntries = data.entries.map((e) => ({
        date: e.date,
        projectName: e.projectName,
        clientName: e.clientName,
        description: e.description,
        durationMinutes: e.durationMinutes,
        rate: e.rate,
        amount: e.amount,
      }))

      const blob = await pdf(
        <ReportPDF
          dateRange={{ from: dateRange.from, to: dateRange.to }}
          filters={{
            projects: selectedProjectNames.length > 0 ? selectedProjectNames : undefined,
            clients: selectedClientNames.length > 0 ? selectedClientNames : undefined,
            billingStatus: selectedBillingStatuses.length > 0 ? selectedBillingStatuses.join(', ') : undefined,
          }}
          summary={{
            totalMinutes: data.totalMinutes,
            totalAmount: data.totalAmount,
            workingDays: data.workingDays,
            billingBreakdown: data.billingBreakdown,
          }}
          byProject={data.byProject}
          byClient={data.byClient}
          entries={pdfEntries}
        />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'report.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('PDF exported')
    } catch {
      toast.error('Failed to generate PDF')
    }
  }

  const projectItems = projects.map((p) => ({ id: p.id, name: p.name, color: p.color ?? undefined }))
  const clientItems = clients.map((c) => ({ id: c.id, name: c.name }))

  return (
    <div className="space-y-6 px-5 py-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl font-medium tracking-tight">Reports</h1>
        <Button onClick={handleExportPDF}>
          <FileText className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {/* Date Range Picker */}
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker value={dateRange} onChange={setDateRange} className="w-full sm:w-auto" />
        {compareMode && (
          <>
            <span className="text-sm text-muted-foreground">vs</span>
            <DateRangePicker value={compareDateRange} onChange={setCompareDateRange} className="w-full sm:w-auto" />
          </>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <MultiSelectFilter
          label="Projects"
          items={projectItems}
          selectedIds={selectedProjectIds}
          onSelectionChange={setSelectedProjectIds}
        />
        <MultiSelectFilter
          label="Clients"
          items={clientItems}
          selectedIds={selectedClientIds}
          onSelectionChange={setSelectedClientIds}
        />
        <MultiSelectFilter
          label="statuses"
          items={[
            { id: 'not_paid', name: 'Not Paid', color: '#e1d4c0' },
            { id: 'invoice_sent', name: 'Invoice Sent', color: '#fddd74' },
            { id: 'paid', name: 'Paid', color: '#45825d' },
          ]}
          selectedIds={selectedBillingStatuses}
          onSelectionChange={(ids) => setSelectedBillingStatuses(ids as BillingStatusValue[])}
        />
        <Button
          variant={compareMode ? 'default' : 'outline'}
          size="sm"
          className="ml-auto"
          onClick={() => setCompareMode(!compareMode)}
        >
          <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" />
          Compare
        </Button>
      </div>

      {/* KPI Cards */}
      <KPICards
        data={data}
        compareData={compareMode ? compareData : null}
        loading={data.isLoading}
        compareLoading={compareData.isLoading}
        compareMode={compareMode}
      />

      {/* Row 1: Billing + Earnings donuts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BillingDonutChart data={data} loading={data.isLoading} />
        <EarningsDonutChart data={data} loading={data.isLoading} />
      </div>

      {/* Row 2: Trend chart (full width) */}
      <TrendChart
        data={data}
        compareData={compareMode ? compareData : null}
        dateRange={dateRange}
        compareDateRange={compareMode ? compareDateRange : null}
        loading={data.isLoading}
        compareMode={compareMode}
      />

      {/* Time Entries */}
      <TimeEntriesTable data={data} loading={data.isLoading} />
    </div>
  )
}
