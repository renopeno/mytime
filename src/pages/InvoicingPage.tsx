import { useState, useMemo, useRef } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Check, ChevronDown, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { useProjects } from '@/hooks/useProjects'
import { useClients } from '@/hooks/useClients'
import { useSettings } from '@/hooks/useSettings'
import { useIsMobile } from '@/hooks/use-mobile'
import { formatDuration } from '@/lib/duration'
import { formatDate, formatCurrency } from '@/lib/format'
import { resolveHourlyRate } from '@/lib/rate'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
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
import { Calendar } from '@/components/ui/calendar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BulkActionBar } from '@/components/ui/bulk-action-bar'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import type { DateRange } from '@/components/ui/date-range-picker'
import { DurationInput } from '@/components/time-entries/DurationInput'
import { ProjectCombobox } from '@/components/time-entries/ProjectCombobox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useShiftSelect } from '@/hooks/useShiftSelect'
import type { TimeEntryWithProject } from '@/types/app.types'

type PaidFilter = 'unpaid' | 'paid' | 'all'

// ─── Multi-Select Filter (same as Reports) ──────────────────────────────────

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

// ─── Inline Editable Cell ────────────────────────────────────────────────────

function EditableText({
  value,
  onSave,
  className,
}: {
  value: string
  onSave: (val: string) => void
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setDraft(value)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function commit() {
    setEditing(false)
    if (draft !== value) onSave(draft)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        className={cn('h-7 w-full rounded-[10px] border px-2 text-sm outline-none focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/50', className)}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        autoFocus
      />
    )
  }

  return (
    <span className={cn('cursor-text', className)} onClick={startEdit}>
      {value || <span className="text-muted-foreground italic">—</span>}
    </span>
  )
}

function EditableDuration({
  value,
  onSave,
}: {
  value: number
  onSave: (minutes: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function startEdit() {
    setDraft(value)
    setEditing(true)
  }

  function commit() {
    setEditing(false)
    if (draft !== value) onSave(draft)
  }

  if (editing) {
    return (
      <DurationInput
        autoFocus
        value={draft}
        onChange={setDraft}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') setEditing(false)
        }}
        onBlur={commit}
        className="h-7 w-full rounded-[10px] border px-1 text-right text-sm focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/50"
      />
    )
  }

  return (
    <span className="cursor-text" onClick={startEdit}>
      {formatDuration(value)}
    </span>
  )
}

function EditableDate({
  value,
  onSave,
}: {
  value: string
  onSave: (date: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button type="button" className="cursor-text whitespace-nowrap text-left hover:underline" />
        }
      >
        {formatDate(value)}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={new Date(value + 'T00:00:00')}
          onSelect={(d) => {
            if (d) {
              const formatted = format(d, 'yyyy-MM-dd')
              if (formatted !== value) onSave(formatted)
              setOpen(false)
            }
          }}
          weekStartsOn={1}
        />
      </PopoverContent>
    </Popover>
  )
}

// ─── Status Cell ─────────────────────────────────────────────────────────────

function StatusCell({
  entry,
  onUpdate,
}: {
  entry: TimeEntryWithProject
  onUpdate: (updates: { is_paid?: boolean; is_invoiced?: boolean }) => void
}) {
  const label = entry.is_paid ? 'Paid' : entry.is_invoiced ? 'Invoiced' : 'Not paid'
  const variant = entry.is_paid ? 'paid' : entry.is_invoiced ? 'invoiced' : 'not-paid'

  return (
    <Popover>
      <PopoverTrigger render={<button type="button" className="cursor-pointer" />}>
        <Badge variant={variant as 'paid' | 'invoiced' | 'not-paid'}>{label}</Badge>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-36 p-1">
        <button
          type="button"
          onClick={() => onUpdate({ is_paid: false, is_invoiced: false })}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent"
        >
          <span className="h-2 w-2 rounded-full bg-status-not-paid" />
          Not paid
        </button>
        <button
          type="button"
          onClick={() => onUpdate({ is_paid: false, is_invoiced: true })}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent"
        >
          <span className="h-2 w-2 rounded-full bg-status-invoiced" />
          Invoiced
        </button>
        <button
          type="button"
          onClick={() => onUpdate({ is_paid: true, is_invoiced: true })}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent"
        >
          <span className="h-2 w-2 rounded-full bg-status-paid" />
          Paid
        </button>
      </PopoverContent>
    </Popover>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function InvoicingPage() {
  const isMobile = useIsMobile()
  const now = new Date()
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(now),
    to: endOfMonth(now),
  })
  const [paidFilter, setPaidFilter] = useState<PaidFilter>('unpaid')
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { settings } = useSettings()
  const { projects } = useProjects()
  const { clients } = useClients()

  const fetchOptions = useMemo(() => {
    const opts: {
      startDate?: string
      endDate?: string
      isPaid?: boolean
    } = {
      startDate: format(dateRange.from, 'yyyy-MM-dd'),
      endDate: format(dateRange.to, 'yyyy-MM-dd'),
    }

    if (paidFilter === 'unpaid') opts.isPaid = false
    else if (paidFilter === 'paid') opts.isPaid = true

    return opts
  }, [dateRange, paidFilter])

  const { entries: rawEntries, loading, updateEntry, deleteEntry, bulkUpdatePaid, bulkUpdateInvoiced } =
    useTimeEntries(fetchOptions)

  // Client-side filtering for project/client multi-select
  const entries = useMemo(() => {
    let filtered = rawEntries
    if (selectedProjectIds.length > 0) {
      const set = new Set(selectedProjectIds)
      filtered = filtered.filter(e => e.project_id && set.has(e.project_id))
    }
    if (selectedClientIds.length > 0) {
      const set = new Set(selectedClientIds)
      filtered = filtered.filter(e => e.project?.client_id && set.has(e.project.client_id))
    }
    return filtered
  }, [rawEntries, selectedProjectIds, selectedClientIds])

  const defaultRate = settings?.default_hourly_rate ?? 0

  function getEffectiveRate(entry: TimeEntryWithProject): number {
    return resolveHourlyRate(entry.project, entry.project?.client, settings)
  }

  function getAmount(entry: TimeEntryWithProject): number {
    return (entry.duration_minutes / 60) * getEffectiveRate(entry)
  }

  const totals = useMemo(() => {
    const totalMinutes = entries.reduce((sum, e) => sum + e.duration_minutes, 0)
    const totalAmount = entries.reduce((sum, e) => sum + getAmount(e), 0)
    return { totalMinutes, totalAmount }
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

  const entryItems = useMemo(() => entries.map((e) => ({ id: e.id })), [entries])
  const { getClickHandler } = useShiftSelect(entryItems, selectedIds, setSelectedIds)

  async function handleUpdate(id: string, updates: Record<string, unknown>) {
    const { error } = await updateEntry(id, updates as Parameters<typeof updateEntry>[1])
    if (error) toast.error('Failed to update entry')
  }

  async function handleDelete(id: string) {
    const { error } = await deleteEntry(id)
    if (error) toast.error('Failed to delete entry')
    else {
      toast.success('Entry deleted')
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function handleMarkPaid() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    const { error } = await bulkUpdatePaid(ids, true)
    if (error) toast.error('Failed to mark entries as paid')
    else {
      toast.success(`${ids.length} ${ids.length === 1 ? 'entry' : 'entries'} marked as paid`)
      setSelectedIds(new Set())
    }
  }

  async function handleMarkInvoiced() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    const { error } = await bulkUpdateInvoiced(ids, true)
    if (error) toast.error('Failed to mark entries as invoiced')
    else {
      toast.success(`${ids.length} ${ids.length === 1 ? 'entry' : 'entries'} marked as invoiced`)
      setSelectedIds(new Set())
    }
  }

  const projectItems = projects.map((p) => ({ id: p.id, name: p.name, color: p.client?.color ?? '#6789b9' }))
  const clientItems = clients.map((c) => ({ id: c.id, name: c.name, color: c.color ?? '#6789b9' }))

  return (
    <div className="space-y-6 px-5 py-6 md:px-8 md:py-8">
      <div>
        <h1 className="font-serif text-3xl font-normal tracking-tight">Invoicing</h1>
        <p className="text-sm text-muted-foreground">
          Review time entries and manage payment status
        </p>
      </div>

      {/* Paid tabs */}
      <Tabs value={paidFilter} onValueChange={(v) => { setPaidFilter(v as PaidFilter); setSelectedIds(new Set()) }}>
        <TabsList>
          <TabsTrigger value="unpaid">Not paid</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card className="py-3">
          <CardContent className="px-4 flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Total entries</p>
            <p className="font-serif text-xl font-normal">{loading ? '—' : entries.length}</p>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="px-4 flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Total hours</p>
            <p className="font-serif text-xl font-normal">{loading ? '—' : formatDuration(totals.totalMinutes)}</p>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="px-4 flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Total amount</p>
            <p className="font-serif text-xl font-normal">{loading ? '—' : formatCurrency(totals.totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
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
      </div>

      <BulkActionBar count={selectedIds.size} open={someSelected} onClose={() => setSelectedIds(new Set())}>
        {paidFilter !== 'paid' && (
          <>
            <Button
              size="sm"
              className="border-transparent bg-white/[0.08] text-white/90 hover:bg-white/[0.14] hover:text-white"
              variant="outline"
              onClick={handleMarkInvoiced}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Mark as Invoiced
            </Button>
            <Button
              size="sm"
              className="border-transparent bg-white/[0.08] text-white/90 hover:bg-white/[0.14] hover:text-white"
              variant="outline"
              onClick={handleMarkPaid}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Mark as Paid
            </Button>
          </>
        )}
      </BulkActionBar>

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
      ) : isMobile ? (
        <div className="space-y-3">
          {entries.map((entry) => {
            const rate = getEffectiveRate(entry)
            const amount = getAmount(entry)
            const isSelected = selectedIds.has(entry.id)

            return (
              <div
                key={entry.id}
                className={cn(
                  'rounded-lg border bg-card p-4 space-y-3',
                  isSelected && 'ring-2 ring-primary/50 bg-primary/[0.03]'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onClick={getClickHandler(entry.id)}
                      aria-label={`Select entry ${entry.description}`}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{formatDate(entry.date)}</p>
                      {entry.project ? (
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.project.client?.color ?? '#6789b9' }} />
                          <span className="truncate">{entry.project.name}</span>
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">No project</span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">
                    {rate > 0 ? formatCurrency(amount) : <span className="text-muted-foreground">--</span>}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground truncate pl-8">
                  {entry.description || <span className="italic">No description</span>}
                </p>

                <div className="flex items-center gap-2 pl-8">
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(entry.duration_minutes)}
                  </span>
                  <StatusCell entry={entry} onUpdate={(u) => handleUpdate(entry.id, u)} />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table className="[&_td]:py-2.5">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[80px] text-right">Duration</TableHead>
                <TableHead className="w-[80px] text-right">Rate</TableHead>
                <TableHead className="w-[90px] text-right">Amount</TableHead>
                <TableHead className="w-[90px] text-center">Status</TableHead>
                <TableHead className="w-[50px]" />
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
                    className={cn(isSelected && 'bg-primary/[0.04]')}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onClick={getClickHandler(entry.id)}
                        aria-label={`Select entry ${entry.description}`}
                      />
                    </TableCell>
                    <TableCell>
                      <EditableDate
                        value={entry.date}
                        onSave={(d) => handleUpdate(entry.id, { date: d })}
                      />
                    </TableCell>
                    <TableCell>
                      <ProjectCombobox
                        value={entry.project_id ?? ''}
                        onValueChange={(projectId) => handleUpdate(entry.id, { project_id: projectId || null })}
                        placeholder="No project"
                        inputClassName="h-7 !rounded-[10px] !border-transparent !bg-transparent !px-0 hover:!bg-muted/50 focus-visible:!bg-background focus-visible:!border-accent"
                      />
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <EditableText
                        value={entry.description}
                        onSave={(desc) => handleUpdate(entry.id, { description: desc })}
                        className="block truncate text-sm"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <EditableDuration
                        value={entry.duration_minutes}
                        onSave={(m) => handleUpdate(entry.id, { duration_minutes: m })}
                      />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                      {rate > 0 ? formatCurrency(rate) : '--'}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap font-medium">
                      {rate > 0 ? formatCurrency(amount) : <span className="text-muted-foreground">--</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusCell entry={entry} onUpdate={(u) => handleUpdate(entry.id, u)} />
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <button
                              type="button"
                              className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/row:opacity-100 [tr:hover_&]:opacity-100"
                            />
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete entry?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this time entry. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(entry.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
