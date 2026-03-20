import { useState, useMemo } from 'react'
import { startOfMonth, endOfMonth, parseISO, format, getDay, eachDayOfInterval } from 'date-fns'
import { toast } from 'sonner'
import { FileText, ArrowLeftRight, ChevronDown, Info } from 'lucide-react'
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
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// ─── Constants ──────────────────────────────────────────────────────────────

const ACCENT = '#6366f1'

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
  const { totalMinutes, totalAmount, workingDays, totalWorkingDays } = data

  const activeRatio = totalWorkingDays > 0 ? Math.round((workingDays / totalWorkingDays) * 100) : 0
  const compareActiveRatio = compareMode && compareData && compareData.totalWorkingDays > 0
    ? Math.round((compareData.workingDays / compareData.totalWorkingDays) * 100)
    : 0

  const minutesDelta = compareMode && compareData ? computeDelta(totalMinutes, compareData.totalMinutes) : null
  const amountDelta = compareMode && compareData ? computeDelta(totalAmount, compareData.totalAmount) : null
  const daysDelta = compareMode && compareData ? computeDelta(activeRatio, compareActiveRatio) : null

  const activeProjects = data.activeProjects
  const compareActiveProjects = compareMode && compareData ? compareData.activeProjects : 0
  const projectsDelta = compareMode && compareData ? computeDelta(activeProjects, compareActiveProjects) : null

  return (
    <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 py-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:py-0 lg:grid-cols-4 [&>*]:min-w-[200px] [&>*]:shrink-0 sm:[&>*]:min-w-0 sm:[&>*]:shrink [&_[data-slot=card-header]]:[container-type:normal] sm:[&_[data-slot=card-header]]:[container-type:inline-size]">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="whitespace-nowrap text-sm font-normal text-muted-foreground sm:whitespace-normal">Active Projects</CardTitle>
        </CardHeader>
        <CardContent className="mt-auto">
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="flex items-baseline gap-2">
              <p className="whitespace-nowrap font-serif text-2xl font-normal">{activeProjects}</p>
              {compareMode && !compareLoading && projectsDelta && (
                <span className={`text-sm font-medium ${deltaColorClass(projectsDelta)}`}>{projectsDelta}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="whitespace-nowrap text-sm font-normal text-muted-foreground sm:whitespace-normal">Total Hours</CardTitle>
        </CardHeader>
        <CardContent className="mt-auto">
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="flex items-baseline gap-2">
              <p className="whitespace-nowrap font-serif text-2xl font-normal">{formatHoursMinutes(totalMinutes)}</p>
              {compareMode && !compareLoading && minutesDelta && (
                <span className={`text-sm font-medium ${deltaColorClass(minutesDelta)}`}>{minutesDelta}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="whitespace-nowrap text-sm font-normal text-muted-foreground sm:whitespace-normal">Total Earned</CardTitle>
        </CardHeader>
        <CardContent className="mt-auto">
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="flex items-baseline gap-2">
              <p className="whitespace-nowrap font-serif text-2xl font-normal">{formatCurrency(totalAmount)}</p>
              {compareMode && !compareLoading && amountDelta && (
                <span className={`text-sm font-medium ${deltaColorClass(amountDelta)}`}>{amountDelta}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 whitespace-nowrap text-sm font-normal text-muted-foreground sm:whitespace-normal">
            Working Days Active
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex cursor-help" />}>
                  <Info className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>
                  Percentage of weekdays (Mon–Fri) in the selected period where you logged any time.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-auto">
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="flex items-baseline gap-2">
              <p className="whitespace-nowrap font-serif text-2xl font-normal">{activeRatio}%</p>
              {compareMode && !compareLoading && daysDelta && (
                <span className={`text-sm font-medium ${deltaColorClass(daysDelta)}`}>{daysDelta}</span>
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
  strokeWidth = 26,
  centerLabel,
  centerValue,
  activeIndex,
  onSegmentClick,
}: {
  segments: Array<{ name: string; value: number; color: string }>
  size?: number
  strokeWidth?: number
  centerLabel?: string
  centerValue?: string
  activeIndex?: number | null
  onSegmentClick?: (index: number) => void
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const cx = size / 2
  const cy = size / 2

  if (total === 0) return null

  const filtered = segments.filter((s) => s.value > 0)

  // Build arcs with natural positions (no overlap tricks on the bodies)
  let cumulativeLength = 0
  const arcs = filtered.map((seg, i) => {
    const fraction = seg.value / total
    const segLength = fraction * circumference
    const naturalStart = cumulativeLength
    cumulativeLength += segLength
    return { ...seg, index: i, segLength, naturalStart }
  })

  // End-cap length: a short arc at each segment's tail, rendered with round caps
  const capLen = strokeWidth * 1.2

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
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
        {/*
          Two-layer approach:
          Layer 1 — Flat bodies: every segment at its exact natural position
          with butt caps so no segment bleeds into its neighbours.
          Layer 2 — Rounded end caps: a short arc at the tail of each segment
          rendered in reverse order (last = bottom, first = top) so each
          segment's rounded end overlaps the next segment's start.
        */}
        {/* Layer 1: flat segment bodies */}
        {arcs.map((arc) => {
          const isSelected = activeIndex != null && activeIndex === arc.index
          return (
            <circle
              key={`body-${arc.name}`}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arc.segLength} ${circumference - arc.segLength}`}
              strokeDashoffset={-arc.naturalStart}
              strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`}
              className={[
                'transition-[filter] duration-200',
                isSelected ? '[filter:brightness(0.82)]' : '',
                onSegmentClick ? 'cursor-pointer hover:[filter:brightness(0.82)]' : '',
              ].join(' ')}
              onClick={() => onSegmentClick?.(arc.index)}
            />
          )
        })}
        {/* Layer 2: rounded end caps, reversed so each cap sits above the next segment */}
        {[...arcs].reverse().map((arc) => {
          const isSelected = activeIndex != null && activeIndex === arc.index
          // Position the cap at the END of the segment
          const capStart = arc.naturalStart + arc.segLength - capLen
          return (
            <circle
              key={`cap-${arc.name}`}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${capLen} ${circumference - capLen}`}
              strokeDashoffset={-capStart}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              className={[
                'transition-[filter] duration-200',
                isSelected ? '[filter:brightness(0.82)]' : '',
                onSegmentClick ? 'cursor-pointer hover:[filter:brightness(0.82)]' : '',
              ].join(' ')}
              onClick={() => onSegmentClick?.(arc.index)}
            />
          )
        })}
      </svg>
      {/* Center text */}
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerLabel && <span className="text-xs text-muted-foreground transition-all duration-200">{centerLabel}</span>}
          {centerValue && <span className="font-serif text-lg font-normal transition-all duration-200">{centerValue}</span>}
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

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const activeSegment = selectedIndex != null ? segments[selectedIndex] : null

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
          <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:gap-8">
            <div className="shrink-0 self-center">
              <LayeredRingChart
                segments={segments}
                centerLabel={activeSegment?.name ?? 'Total'}
                centerValue={formatCurrency(activeSegment?.value ?? total)}
                activeIndex={selectedIndex}
                onSegmentClick={(i) => setSelectedIndex(prev => prev === i ? null : i)}
              />
            </div>
            {/* Legend: horizontal wrap on mobile, vertical column on sm+ */}
            <div className="@container flex flex-wrap justify-center gap-x-1 gap-y-1 sm:flex-col sm:gap-3 sm:min-w-0 sm:flex-1">
              {allStatuses.map((item) => {
                const segIdx = segments.findIndex(s => s.name === item.name)
                const isActive = segIdx >= 0 && segIdx === selectedIndex
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
                return (
                  <button
                    key={item.name}
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors duration-150 hover:bg-muted/50 sm:gap-2.5 sm:py-1.5 ${isActive ? 'bg-muted/50' : ''}`}
                    onClick={() => segIdx >= 0 && setSelectedIndex(prev => prev === segIdx ? null : segIdx)}
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full sm:h-3 sm:w-3"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className={`text-sm whitespace-nowrap sm:truncate transition-colors duration-150 ${isActive ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {item.name}
                    </span>
                    <span className={`hidden shrink-0 text-sm tabular-nums transition-colors duration-150 @[10rem]:inline ${isActive ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
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

// ─── Earnings Donut Chart (By Client / Project) ─────────────────────────────

const MIN_SEGMENT_THRESHOLD = 0.05

type EarningsGrouping = 'client' | 'project'

function buildEarningsSegments(
  items: Array<{ name: string; amount: number; color?: string }>,
) {
  const sorted = [...items]
    .map((item, index) => ({
      name: item.name,
      amount: Math.round(item.amount * 100) / 100,
      color: getColor(item.color, index),
    }))
    .sort((a, b) => b.amount - a.amount)

  const total = sorted.reduce((sum, s) => sum + s.amount, 0)
  if (total === 0) return { segments: [], legendItems: [] }

  const main: Array<{ name: string; value: number; color: string }> = []
  let otherAmount = 0
  const legend: Array<{ name: string; amount: number; color: string }> = []

  for (const item of sorted) {
    if (item.amount / total < MIN_SEGMENT_THRESHOLD && sorted.length > 3) {
      otherAmount += item.amount
    } else {
      main.push({ name: item.name, value: item.amount, color: item.color })
      legend.push({ name: item.name, amount: item.amount, color: item.color })
    }
  }

  if (otherAmount > 0) {
    main.push({ name: 'Other', value: Math.round(otherAmount * 100) / 100, color: '#c4b5a0' })
    legend.push({ name: 'Other', amount: Math.round(otherAmount * 100) / 100, color: '#c4b5a0' })
  }

  return { segments: main, legendItems: legend }
}

function EarningsDonutChart({
  data,
  loading,
}: {
  data: DashboardData
  loading: boolean
}) {
  const [grouping, setGrouping] = useState<EarningsGrouping>('client')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const { segments, legendItems } = useMemo(() => {
    const items = grouping === 'project' ? data.byProject : data.byClient
    return buildEarningsSegments(items)
  }, [data.byProject, data.byClient, grouping])

  // Reset selection when switching grouping
  const prevGrouping = useMemo(() => grouping, [grouping])
  useMemo(() => { if (prevGrouping !== grouping) setSelectedIndex(null) }, [grouping, prevGrouping])

  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const activeSegment = selectedIndex != null ? segments[selectedIndex] : null

  if (loading) return <Skeleton className="h-[350px] w-full" />

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base font-medium">Earnings</CardTitle>
        <SegmentControl
          options={[
            { value: 'client' as EarningsGrouping, label: 'Client' },
            { value: 'project' as EarningsGrouping, label: 'Project' },
          ]}
          value={grouping}
          onChange={(v) => { setGrouping(v); setSelectedIndex(null) }}
        />
      </CardHeader>
      <CardContent>
        {segments.length === 0 ? (
          <NoData />
        ) : (
          <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:gap-8">
            <div className="shrink-0 self-center">
              <LayeredRingChart
                segments={segments}
                centerLabel={activeSegment?.name ?? 'Total'}
                centerValue={formatCurrency(activeSegment?.value ?? total)}
                activeIndex={selectedIndex}
                onSegmentClick={(i) => setSelectedIndex(prev => prev === i ? null : i)}
              />
            </div>
            {/* Legend: horizontal wrap on mobile, vertical column on sm+ */}
            <div className="@container flex flex-wrap justify-center gap-x-1 gap-y-1 sm:flex-col sm:gap-2 sm:min-w-0 sm:flex-1">
              {legendItems.map((item) => {
                const segIdx = segments.findIndex(s => s.name === item.name)
                const isActive = segIdx >= 0 && segIdx === selectedIndex
                const pct = total > 0 ? Math.round((item.amount / total) * 100) : 0
                return (
                  <button
                    key={item.name}
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors duration-150 hover:bg-muted/50 sm:gap-2.5 sm:py-1.5 ${isActive ? 'bg-muted/50' : ''}`}
                    onClick={() => segIdx >= 0 && setSelectedIndex(prev => prev === segIdx ? null : segIdx)}
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full sm:h-3 sm:w-3"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className={`text-sm whitespace-nowrap sm:truncate transition-colors duration-150 ${isActive ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {item.name}
                    </span>
                    <span className={`hidden shrink-0 text-sm tabular-nums transition-colors duration-150 @[10rem]:inline ${isActive ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
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
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                interval={Math.max(0, Math.ceil(chartData.length / 6) - 1)}
                tickFormatter={(label: string) => label.replace(/^\S+\s/, '')}
              />
              <YAxis unit={unit} tickFormatter={metric === 'earnings' ? (v) => `${Math.round(v)}` : undefined} />
              <RechartsTooltip formatter={(value) => [formatter(Number(value)), '']} />
              <Area
                type="linear"
                dataKey="value"
                name="Current"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#trendGradient)"
              />
              {compareMode && compareData && (
                <Area
                  type="linear"
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

// ─── Weekday Avg Chart ──────────────────────────────────────────────────────

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

function WeekdayChart({
  data,
  dateRange,
  loading,
}: {
  data: DashboardData
  dateRange: DateRange
  loading: boolean
}) {
  const chartData = useMemo(() => {
    // Count how many of each weekday exist in the range (capped at today)
    const today = new Date()
    const rangeEnd = dateRange.to > today ? today : dateRange.to
    if (rangeEnd < dateRange.from) return []

    const allDays = eachDayOfInterval({ start: dateRange.from, end: rangeEnd })
    const weekdayCounts = [0, 0, 0, 0, 0] // Mon–Fri
    for (const d of allDays) {
      const dow = getDay(d) // 0=Sun, 1=Mon, ..., 6=Sat
      if (dow >= 1 && dow <= 5) weekdayCounts[dow - 1]++
    }

    // Sum minutes per weekday from entries
    const weekdayMinutes = [0, 0, 0, 0, 0]
    for (const entry of data.entries) {
      const dow = getDay(parseISO(entry.date))
      if (dow >= 1 && dow <= 5) weekdayMinutes[dow - 1] += entry.durationMinutes
    }

    return WEEKDAY_LABELS.map((label, i) => ({
      day: label,
      hours: weekdayCounts[i] > 0
        ? Math.round((weekdayMinutes[i] / 60 / weekdayCounts[i]) * 100) / 100
        : 0,
    }))
  }, [data.entries, dateRange])

  if (loading) return <Skeleton className="h-[350px] w-full" />

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Avg Hours by Weekday</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <NoData />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis unit="h" />
              <RechartsTooltip formatter={(value) => [`${value}h`, 'Avg']} />
              <Bar
                dataKey="hours"
                fill={ACCENT}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
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
    <Card>
      <CardHeader>
        <div className="flex items-baseline gap-2">
          <CardTitle className="text-base font-medium">Time Entries</CardTitle>
          <span className="text-sm text-muted-foreground">({sortedEntries.length})</span>
        </div>
      </CardHeader>
      <CardContent>
      <div className="rounded-lg border overflow-hidden bg-background">
        {isMobile ? (
          <div className="divide-y divide-border">
            {visibleEntries.map((entry, i) => {
              const color = entry.projectName ? projectColorMap.get(entry.projectName) : undefined
              return (
                <div key={i} className="p-4 space-y-2">
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
                  <TableRow key={i}>
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
      </CardContent>
    </Card>
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
            totalWorkingDays: data.totalWorkingDays,
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

  const projectItems = projects.map((p) => ({ id: p.id, name: p.name, color: p.client?.color ?? '#6789b9' }))
  const clientItems = clients.map((c) => ({ id: c.id, name: c.name, color: c.color ?? '#6789b9' }))

  return (
    <div className="space-y-6 px-5 py-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl font-normal tracking-tight">Reports</h1>
        <Button onClick={handleExportPDF}>
          <FileText className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {/* Date Range Picker + Compare */}
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker value={dateRange} onChange={setDateRange} className="w-full sm:w-auto" />
        {compareMode && (
          <>
            <span className="text-sm text-muted-foreground">vs</span>
            <DateRangePicker value={compareDateRange} onChange={setCompareDateRange} className="w-full sm:w-auto" />
          </>
        )}
        <Button
          variant={compareMode ? 'default' : 'outline'}
          onClick={() => setCompareMode(!compareMode)}
        >
          <ArrowLeftRight className="mr-1.5 h-4 w-4" />
          Compare
        </Button>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <MultiSelectFilter
          label="Clients"
          items={clientItems}
          selectedIds={selectedClientIds}
          onSelectionChange={setSelectedClientIds}
        />
        <MultiSelectFilter
          label="Projects"
          items={projectItems}
          selectedIds={selectedProjectIds}
          onSelectionChange={setSelectedProjectIds}
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

      {/* Row 2: Trend + Weekday */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TrendChart
          data={data}
          compareData={compareMode ? compareData : null}
          dateRange={dateRange}
          compareDateRange={compareMode ? compareDateRange : null}
          loading={data.isLoading}
          compareMode={compareMode}
        />
        <WeekdayChart
          data={data}
          dateRange={dateRange}
          loading={data.isLoading}
        />
      </div>

      {/* Time Entries */}
      <TimeEntriesTable data={data} loading={data.isLoading} />
    </div>
  )
}
