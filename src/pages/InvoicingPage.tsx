import { useState, useMemo } from 'react'
import {
  format,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear,
  subWeeks, subMonths, subYears,
} from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { CalendarIcon, Check, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { useSettings } from '@/hooks/useSettings'
import { formatDuration } from '@/lib/duration'
import { formatDate, formatCurrency } from '@/lib/format'
import { ProjectSelect } from '@/components/projects/ProjectSelect'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TimeEntryWithProject } from '@/types/app.types'

type PaidFilter = 'unpaid' | 'paid' | 'all'
type InvoicedFilter = 'all' | 'invoiced' | 'not_invoiced'



const INVOICED_LABELS: Record<InvoicedFilter, string> = {
  all: 'Invoiced status',
  invoiced: 'Invoiced',
  not_invoiced: 'Not invoiced',
}
type DatePreset = 'this_week' | 'this_month' | 'last_week' | 'last_month' | 'this_year' | 'last_year' | 'custom' | ''

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'this_week',   label: 'This week' },
  { value: 'this_month',  label: 'This month' },
  { value: 'last_week',   label: 'Last week' },
  { value: 'last_month',  label: 'Last month' },
  { value: 'this_year',   label: 'This year' },
  { value: 'last_year',   label: 'Last year' },
  { value: 'custom',      label: 'Custom...' },
]

export default function InvoicingPage() {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [datePreset, setDatePreset] = useState<DatePreset>('')
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [paidFilter, setPaidFilter] = useState<PaidFilter>('unpaid')
  const [invoicedFilter, setInvoicedFilter] = useState<InvoicedFilter>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { settings } = useSettings()

  function applyPreset(preset: DatePreset) {
    const now = new Date()
    setDatePreset(preset)
    if (preset === 'custom') return
    setCustomRange(undefined)
    switch (preset) {
      case 'this_week':
        setStartDate(startOfWeek(now, { weekStartsOn: 1 }))
        setEndDate(endOfWeek(now, { weekStartsOn: 1 }))
        break
      case 'this_month':
        setStartDate(startOfMonth(now))
        setEndDate(endOfMonth(now))
        break
      case 'last_week': {
        const lw = subWeeks(now, 1)
        setStartDate(startOfWeek(lw, { weekStartsOn: 1 }))
        setEndDate(endOfWeek(lw, { weekStartsOn: 1 }))
        break
      }
      case 'last_month': {
        const lm = subMonths(now, 1)
        setStartDate(startOfMonth(lm))
        setEndDate(endOfMonth(lm))
        break
      }
      case 'this_year':
        setStartDate(startOfYear(now))
        setEndDate(endOfYear(now))
        break
      case 'last_year': {
        const ly = subYears(now, 1)
        setStartDate(startOfYear(ly))
        setEndDate(endOfYear(ly))
        break
      }
    }
    setDatePickerOpen(false)
  }

  function handleCustomRangeSelect(range: DateRange | undefined) {
    setCustomRange(range)
    setStartDate(range?.from)
    const hasFullRange =
      range?.from &&
      range?.to &&
      format(range.from, 'yyyy-MM-dd') !== format(range.to, 'yyyy-MM-dd')
    if (hasFullRange) {
      setEndDate(range!.to)
      setDatePickerOpen(false)
    } else {
      setEndDate(undefined)
    }
  }

  function getDateLabel(): string | null {
    if (!datePreset) return null
    const preset = DATE_PRESETS.find((p) => p.value === datePreset)
    if (datePreset === 'custom' && startDate && endDate) {
      return `${format(startDate, 'dd.MM.yy')} – ${format(endDate, 'dd.MM.yy')}`
    }
    return preset?.label ?? null
  }

  const fetchOptions = useMemo(() => {
    const opts: {
      startDate?: string
      endDate?: string
      projectId?: string
      isPaid?: boolean
      isInvoiced?: boolean
    } = {}

    if (startDate) opts.startDate = format(startDate, 'yyyy-MM-dd')
    if (endDate) opts.endDate = format(endDate, 'yyyy-MM-dd')
    if (projectId) opts.projectId = projectId

    if (paidFilter === 'unpaid') opts.isPaid = false
    else if (paidFilter === 'paid') opts.isPaid = true

    if (invoicedFilter === 'invoiced') opts.isInvoiced = true
    else if (invoicedFilter === 'not_invoiced') opts.isInvoiced = false

    return opts
  }, [startDate, endDate, projectId, paidFilter, invoicedFilter])

  const { entries, loading, bulkUpdatePaid, bulkUpdateInvoiced } =
    useTimeEntries(fetchOptions)

  const defaultRate = settings?.default_hourly_rate ?? 0

  function getEffectiveRate(entry: TimeEntryWithProject): number {
    return entry.project?.hourly_rate ?? defaultRate
  }

  function getAmount(entry: TimeEntryWithProject): number {
    const rate = getEffectiveRate(entry)
    return (entry.duration_minutes / 60) * rate
  }

  const totals = useMemo(() => {
    const totalMinutes = entries.reduce((sum, e) => sum + e.duration_minutes, 0)
    const totalAmount = entries.reduce((sum, e) => sum + getAmount(e), 0)
    return { totalMinutes, totalAmount }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, defaultRate])

  const allSelected =
    entries.length > 0 && entries.every((e) => selectedIds.has(e.id))
  const someSelected = selectedIds.size > 0

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(entries.map((e) => e.id)))
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function handleMarkPaid() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    const { error } = await bulkUpdatePaid(ids, true)
    if (error) {
      toast.error('Failed to mark entries as paid')
    } else {
      toast.success(`${ids.length} ${ids.length === 1 ? 'entry' : 'entries'} marked as paid`)
      setSelectedIds(new Set())
    }
  }

  async function handleMarkInvoiced() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    const { error } = await bulkUpdateInvoiced(ids, true)
    if (error) {
      toast.error('Failed to mark entries as invoiced')
    } else {
      toast.success(`${ids.length} ${ids.length === 1 ? 'entry' : 'entries'} marked as invoiced`)
      setSelectedIds(new Set())
    }
  }

  return (
    <div className="space-y-6 px-8 py-8">
      <div>
        <h1 className="font-serif text-2xl font-medium tracking-tight">Invoicing</h1>
        <p className="text-sm text-muted-foreground">
          Review time entries and manage payment status
        </p>
      </div>

      {/* Paid tabs */}
      <Tabs value={paidFilter} onValueChange={(v) => { setPaidFilter(v as PaidFilter); setSelectedIds(new Set()) }}>
        <TabsList>
          <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="py-2">
          <CardContent className="h-10 px-4 flex flex-col justify-center">
            <p className="text-xs text-muted-foreground">Total entries</p>
            <p className="font-serif text-xl font-bold">{loading ? '—' : entries.length}</p>
          </CardContent>
        </Card>
        <Card className="py-2">
          <CardContent className="h-10 px-4 flex flex-col justify-center">
            <p className="text-xs text-muted-foreground">Total hours</p>
            <p className="font-serif text-xl font-bold">{loading ? '—' : formatDuration(totals.totalMinutes)}</p>
          </CardContent>
        </Card>
        <Card className="py-2">
          <CardContent className="h-10 px-4 flex flex-col justify-center">
            <p className="text-xs text-muted-foreground">Total amount</p>
            <p className="font-serif text-xl font-bold">{loading ? '—' : formatCurrency(totals.totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
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
              <div className="flex flex-col py-1 min-w-[160px]">
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => applyPreset(p.value)}
                    className={cn(
                      'flex items-center justify-between px-3 py-1.5 text-sm hover:bg-muted transition-colors text-left',
                      datePreset === p.value && 'font-medium'
                    )}
                  >
                    {p.label}
                    {p.value === 'custom' && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col">
                <button
                  onClick={() => setDatePreset('')}
                  className="flex items-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
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

        <div className="w-[200px]">
          <ProjectSelect
            value={projectId}
            onValueChange={setProjectId}
            placeholder="All projects"
          />
        </div>

        {paidFilter !== 'paid' && (
          <Select value={invoicedFilter} onValueChange={(v) => setInvoicedFilter(v as InvoicedFilter)}>
            <SelectTrigger className="w-[160px]">
              <span className={invoicedFilter === 'all' ? 'text-muted-foreground' : ''}>
                {INVOICED_LABELS[invoicedFilter]}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="invoiced">Invoiced</SelectItem>
              <SelectItem value="not_invoiced">Not invoiced</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3">
          <span className="text-sm font-medium">
            {selectedIds.size} {selectedIds.size === 1 ? 'entry' : 'entries'} selected
          </span>
          <Button size="sm" onClick={handleMarkPaid}>
            <Check className="mr-2 h-4 w-4" />
            Mark as Paid
          </Button>
          <Button size="sm" variant="outline" onClick={handleMarkInvoiced}>
            <Check className="mr-2 h-4 w-4" />
            Mark as Invoiced
          </Button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-muted-foreground">No entries found</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or date range
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Paid</TableHead>
                <TableHead className="text-center">Invoiced</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const rate = getEffectiveRate(entry)
                const amount = getAmount(entry)
                const isSelected = selectedIds.has(entry.id)

                return (
                  <TableRow
                    key={entry.id}
                    className={cn(isSelected && 'bg-muted/50')}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(entry.id)}
                        aria-label={`Select entry ${entry.description}`}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(entry.date)}
                    </TableCell>
                    <TableCell>
                      {entry.project ? (
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: entry.project.color }}
                          />
                          {entry.project.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          No project
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {entry.description || (
                        <span className="text-muted-foreground">
                          No description
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatDuration(entry.duration_minutes)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {rate > 0 ? (
                        formatCurrency(rate)
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap font-medium">
                      {rate > 0 ? (
                        formatCurrency(amount)
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {entry.is_paid ? (
                        <Badge variant="default" className="text-xs">
                          Paid
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Unpaid
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {entry.is_invoiced ? (
                        <Badge variant="default" className="text-xs">
                          Invoiced
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Not invoiced
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

    </div>
  )
}
