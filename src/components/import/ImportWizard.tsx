import React, { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { Upload, FileText, Check, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, Info, Loader2, RotateCcw, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DialogHeader, DialogBody, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import {
  parseCSVText,
  detectFormat,
  transformRows,
  buildProjectSummaries,
} from '@/lib/csv-import'
import type {
  ParsedCSV,
  DetectedFormat,
  ParsedTimeEntry,
  ProjectSummary,
} from '@/lib/csv-import'
import { formatDuration } from '@/lib/duration'
import { formatCurrency } from '@/lib/format'
import { useProjects } from '@/hooks/useProjects'
import { useClients } from '@/hooks/useClients'
import { devBulkImportTimeEntries } from '@/lib/dev-db'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const DEV = import.meta.env.DEV

// ---------------------------------------------------------------------------
// New indicator — pink dot that expands to "New" badge on hover
// ---------------------------------------------------------------------------

function NewIndicator() {
  return (
    <span className="group/new relative inline-flex h-5 items-center">
      {/* Pink dot — visible by default, fades out on hover */}
      <span className="h-2 w-2 shrink-0 rounded-full bg-status-new transition-opacity duration-200 group-hover/new:opacity-0" />
      {/* Full badge — hidden by default, fades in + scales up on hover */}
      <span className="pointer-events-none absolute left-0 inline-flex h-5 items-center rounded-4xl bg-status-new px-2 text-xs font-medium text-white/90 opacity-0 transition-all duration-200 scale-90 group-hover/new:pointer-events-auto group-hover/new:opacity-100 group-hover/new:scale-100">
        New
      </span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

export type WizardStep = 'upload' | 'preview' | 'mapping' | 'import'

export const IMPORT_STEPS: { key: WizardStep; label: string; number: number }[] = [
  { key: 'upload', label: 'Upload', number: 1 },
  { key: 'preview', label: 'Preview', number: 2 },
  { key: 'mapping', label: 'Mapping', number: 3 },
  { key: 'import', label: 'Import', number: 4 },
]

// ---------------------------------------------------------------------------
// Color palette for auto-assigning to new projects
// ---------------------------------------------------------------------------

const PROJECT_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#0ea5e9', // sky
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f97316', // orange
]

// ---------------------------------------------------------------------------
// Step indicator — full-width, clickable, straight lines (dashed/filled)
// ---------------------------------------------------------------------------

function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
}: {
  currentStep: WizardStep
  completedSteps: Set<WizardStep>
  onStepClick: (step: WizardStep) => void
}) {
  const currentIndex = IMPORT_STEPS.findIndex((s) => s.key === currentStep)

  return (
    <div className="mt-6 flex w-full max-w-lg items-center">
      {IMPORT_STEPS.map((step, i) => {
        const isCurrent = step.key === currentStep
        const isCompleted = completedSteps.has(step.key)
        const isReachable = isCompleted || isCurrent
        const lineFilled = i <= currentIndex

        return (
          <React.Fragment key={step.key}>
            {i > 0 && (
              <div className="flex-1 px-2">
                <div
                  className={`h-px transition-colors duration-300 ${
                    lineFilled
                      ? 'bg-neutral-40'
                      : 'border-t border-dashed border-muted-foreground/30'
                  }`}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => isReachable && onStepClick(step.key)}
              disabled={!isReachable}
              className="flex shrink-0 items-center gap-2.5 disabled:cursor-default"
            >
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                  isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'bg-neutral-40'
                      : 'border-[1.5px] border-input'
                }`}
              >
                {isCompleted && <Check className="h-3 w-3" strokeWidth={3} />}
              </div>
              <span
                className={`whitespace-nowrap text-[13px] font-normal leading-none transition-colors duration-300 ${
                  isCurrent
                    ? 'text-primary'
                    : isCompleted
                      ? 'text-muted-foreground hover:text-foreground cursor-pointer'
                      : 'text-muted-foreground/60'
                }`}
              >
                {step.label}
              </span>
            </button>
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Upload step
// ---------------------------------------------------------------------------

function UploadStep({
  onParsed,
  error,
  setError,
}: {
  onParsed: (data: {
    csvData: ParsedCSV
    format: DetectedFormat
    entries: ParsedTimeEntry[]
    summaries: ProjectSummary[]
    fileName: string
  }) => void
  error: string | null
  setError: (err: string | null) => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(
    async (file: File) => {
      setError(null)

      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('Only .csv files are supported. Please select a CSV file.')
        return
      }

      if (file.size === 0) {
        setError('The selected file is empty.')
        return
      }

      setIsProcessing(true)

      try {
        const text = await file.text()
        const csvData = parseCSVText(text)

        if (csvData.headers.length === 0 || csvData.rows.length === 0) {
          setError(
            'The CSV file appears to be empty or has no data rows. Please check the file and try again.',
          )
          setIsProcessing(false)
          return
        }

        const format = detectFormat(csvData.headers)
        const entries = transformRows(csvData.rows, format.mapping)
        const summaries = buildProjectSummaries(entries)

        if (entries.length === 0) {
          setError(
            'No valid time entries found in the CSV. Make sure the file contains rows with duration values.',
          )
          setIsProcessing(false)
          return
        }

        onParsed({
          csvData,
          format,
          entries,
          summaries,
          fileName: file.name,
        })
      } catch {
        setError('Failed to parse the CSV file. Please check the file format and try again.')
      } finally {
        setIsProcessing(false)
      }
    },
    [onParsed, setError],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) void processFile(file)
    },
    [processFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) void processFile(file)
      // Reset input so re-selecting the same file triggers onChange
      e.target.value = ''
    },
    [processFile],
  )

  return (
    <DialogBody className="flex flex-col items-center pt-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-12 transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/15 bg-neutral-30/40 hover:border-muted-foreground/30'
        }`}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Upload className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">
            {isDragging ? 'Drop your CSV file here' : 'Drag & drop your CSV file here'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">or</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
          disabled={isProcessing}
        >
          <FileText className="mr-2 h-4 w-4" />
          {isProcessing ? 'Processing...' : 'Browse files'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileSelect}
        />
        <p className="text-xs text-muted-foreground">Only .csv files are accepted</p>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </DialogBody>
  )
}

// ---------------------------------------------------------------------------
// Placeholder steps (Tasks 3, 4, 5)
// ---------------------------------------------------------------------------

const FORMAT_LABELS: Record<DetectedFormat['name'], string> = {
  toggl: 'Toggl Track',
  clockify: 'Clockify',
  harvest: 'Harvest',
  unknown: 'Unknown format',
}

function BillingStatusBadge({ isPaid, isInvoiced }: { isPaid: boolean | null; isInvoiced: boolean | null }) {
  if (isPaid === true) {
    return <Badge variant="paid">Paid</Badge>
  }
  if (isInvoiced === true) {
    return <Badge variant="invoiced">Invoiced</Badge>
  }
  if (isPaid === false) {
    return <Badge variant="not-paid">Not paid</Badge>
  }
  return <span className="text-muted-foreground">&mdash;</span>
}

function PreviewStep({
  csvData,
  format,
  entries,
  fileName,
  onBack,
  onCancel,
  onNext,
}: {
  csvData: ParsedCSV
  format: DetectedFormat
  entries: ParsedTimeEntry[]
  fileName: string
  onBack: () => void
  onCancel: () => void
  onNext: () => void
}) {
  const previewEntries = entries.slice(0, 5)
  const isKnownFormat = format.name !== 'unknown'

  // Check if any entries have billing info
  const hasBillingTags = entries.some(
    (e) => e.isPaid !== null || e.isInvoiced !== null,
  )

  // Build a stable color map for projects in preview
  const projectColors = new Map<string, string>()
  for (const entry of entries) {
    if (entry.projectName && !projectColors.has(entry.projectName)) {
      projectColors.set(entry.projectName, PROJECT_COLORS[projectColors.size % PROJECT_COLORS.length])
    }
  }

  return (
    <>
    <DialogBody className="space-y-4">
      {/* Billing tag notice — above the table */}
      {hasBillingTags && (
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">
            Detected billing tags: <span className="font-medium text-foreground">paid</span>,{' '}
            <span className="font-medium text-foreground">not paid</span>,{' '}
            <span className="font-medium text-foreground">invoice sent</span>{' '}
            &rarr; automatically mapped to status
          </span>
        </div>
      )}

      {/* Preview table */}
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewEntries.map((entry, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium whitespace-nowrap">{entry.date}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {entry.projectName ? (
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: projectColors.get(entry.projectName) }}
                      />
                      {entry.projectName}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">&mdash;</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">{entry.clientName || <span className="text-muted-foreground">&mdash;</span>}</TableCell>
                <TableCell className="max-w-[200px] truncate" title={entry.description}>
                  {entry.description || <span className="text-muted-foreground">&mdash;</span>}
                </TableCell>
                <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                  {formatDuration(entry.durationMinutes)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <BillingStatusBadge isPaid={entry.isPaid} isInvoiced={entry.isInvoiced} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {entries.length > 5 && (
          <div className="border-t px-4 py-2 text-center text-xs text-muted-foreground">
            Showing first 5 of {entries.length} entries
          </div>
        )}
      </div>

    </DialogBody>
    <DialogFooter className="sm:justify-between">
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext}>
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </DialogFooter>
    </>
  )
}

// ---------------------------------------------------------------------------
// Mapping row state
// ---------------------------------------------------------------------------

interface MappingRowState {
  clientName: string
  clientId: string | null // null = create new, string = existing client ID
  projectName: string
  projectId: string | null // null = create new, string = existing project ID
  hourlyRate: number | null
  /** Original client name from CSV — used for entry lookup even after renaming */
  originalClientName: string
  /** Original project name from CSV — used for entry lookup even after renaming */
  originalProjectName: string
}

// ---------------------------------------------------------------------------
// Inline editable cell
// ---------------------------------------------------------------------------

function EditableCell({
  value,
  onChange,
  className = '',
  placeholder = '',
  type = 'text',
  bordered = false,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  type?: 'text' | 'number'
  bordered?: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const commit = () => {
    setIsEditing(false)
    const trimmed = draft.trim()
    if (type === 'number') {
      const num = parseFloat(trimmed)
      onChange(isNaN(num) ? '' : String(num))
    } else {
      onChange(trimmed)
    }
  }

  return (
    <div className="h-7">
      {isEditing ? (
        <Input
          ref={inputRef}
          type={type}
          step={type === 'number' ? '0.01' : undefined}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setDraft(value)
              setIsEditing(false)
            }
          }}
          className={`h-7 w-full text-sm ${className}`}
          placeholder={placeholder}
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className={`flex h-7 w-full cursor-text items-center rounded px-2 text-left text-sm hover:bg-muted/60 ${bordered ? 'border border-transparent hover:border-border' : ''} ${className}`}
          title="Click to edit"
        >
          {value || <span className="text-muted-foreground">{placeholder || '\u2014'}</span>}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Combobox cell — searchable dropdown with "Create new" option
// ---------------------------------------------------------------------------

function ComboboxCell({
  value,
  selectedId,
  options,
  onChange,
  placeholder = '',
}: {
  value: string
  selectedId: string | null
  options: Array<{ id: string; label: string }>
  onChange: (name: string, id: string | null) => void
  placeholder?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isPreFilled = useRef(false)

  useEffect(() => { setSearch(value) }, [value])
  useEffect(() => {
    if (isOpen) {
      isPreFilled.current = true
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isOpen])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        commitAndClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  })

  const filtered = search && !isPreFilled.current
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()),
      )
    : options
  const exactMatch = options.find((o) => o.label.toLowerCase() === search.trim().toLowerCase())

  const commitAndClose = () => {
    const trimmed = search.trim()
    if (trimmed) {
      const match = options.find((o) => o.label.toLowerCase() === trimmed.toLowerCase())
      onChange(match ? match.label : trimmed, match ? match.id : null)
    }
    setIsOpen(false)
  }

  const handleSelect = (name: string, id: string | null) => {
    onChange(name, id)
    setSearch(name)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative h-7">
      {isOpen ? (
        <>
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => { isPreFilled.current = false; setSearch(e.target.value) }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setSearch(value); setIsOpen(false) }
              if (e.key === 'Enter') {
                e.preventDefault()
                commitAndClose()
              }
            }}
            className="h-7 w-48 text-sm"
            placeholder={placeholder}
          />
          {(filtered.length > 0 || (search.trim() && !exactMatch)) && (
            <div className="absolute left-0 top-8 z-50 max-h-48 min-w-48 overflow-auto rounded-lg border bg-popover py-1 shadow-md">
              {search.trim() && !exactMatch && (
                <button
                  type="button"
                  className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(search.trim(), null) }}
                >
                  Create &ldquo;<span className="font-medium">{search.trim()}</span>&rdquo;
                </button>
              )}
              {filtered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`flex w-full items-center px-2 py-1.5 text-left text-sm hover:bg-muted ${selectedId === o.id ? 'bg-muted/50 font-medium' : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(o.label, o.id) }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={() => { setSearch(value); setIsOpen(true) }}
          className="flex h-7 w-fit cursor-text items-center rounded border border-transparent px-2 text-left text-sm hover:border-border hover:bg-muted/60"
          title="Click to edit"
        >
          {value ? (
            selectedId === null ? (
              <span className="flex items-center gap-1.5">
                <span className="text-sm">{value}</span>
                <NewIndicator />
              </span>
            ) : <span className="text-sm">{value}</span>
          ) : <span className="text-muted-foreground">{placeholder}</span>}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mapping step
// ---------------------------------------------------------------------------

function MappingStep({
  summaries,
  mappings,
  setMappings,
  onBack,
  onCancel,
  onNext,
  onUpdateSummaries,
}: {
  summaries: ProjectSummary[]
  mappings: MappingRowState[]
  setMappings: React.Dispatch<React.SetStateAction<MappingRowState[]>>
  onBack: () => void
  onCancel: () => void
  onNext: () => void
  onUpdateSummaries: (summaries: ProjectSummary[]) => void
}) {
  const { projects } = useProjects()
  const { clients } = useClients()

  const clientOptions = clients.map((c) => ({ id: c.id, label: c.name }))
  const projectOptions = projects.map((p) => ({
    id: p.id,
    label: p.client ? `${p.name} (${p.client.name})` : p.name,
  }))

  // Group indices by original client name (stable grouping key)
  const groups = React.useMemo(() => {
    const map = new Map<string, number[]>()
    mappings.forEach((m, i) => {
      const key = m.originalClientName
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(i)
    })
    return Array.from(map.entries())
  }, [mappings])

  // Expand/collapse state — all expanded by default
  const [expandedClients, setExpandedClients] = useState<Set<string>>(
    () => new Set(mappings.map((m) => m.originalClientName)),
  )

  const toggleExpanded = (key: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const updateRow = (index: number, patch: Partial<MappingRowState>) => {
    setMappings((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const updateClientForGroup = (origClientName: string, name: string, id: string | null) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.originalClientName === origClientName
          ? { ...m, clientName: name, clientId: id }
          : m,
      ),
    )
  }

  const revertGroup = (indices: number[]) => {
    setMappings((prev) => {
      const next = [...prev]
      for (const i of indices) {
        next[i] = {
          ...next[i],
          clientName: next[i].originalClientName,
          clientId: null,
          projectName: next[i].originalProjectName,
          projectId: null,
          hourlyRate: summaries[i].calculatedRate,
        }
      }
      return next
    })
  }

  const handleNext = () => {
    // Auto-resolve unmatched names to existing clients/projects by name
    const resolved = mappings.map((m) => {
      const r = { ...m }
      if (!r.clientId && r.clientName) {
        const match = clients.find((c) => c.name.toLowerCase() === r.clientName.toLowerCase())
        if (match) {
          r.clientId = match.id
          r.clientName = match.name
        }
      }
      if (!r.projectId && r.projectName) {
        const match = projects.find((p) => p.name.toLowerCase() === r.projectName.toLowerCase())
        if (match) {
          r.projectId = match.id
        }
      }
      return r
    })
    setMappings(resolved)

    const updated = summaries.map((s, i) => ({
      ...s,
      clientName: resolved[i].clientName,
      projectName: resolved[i].projectName,
      calculatedRate: resolved[i].hourlyRate,
    }))
    onUpdateSummaries(updated)
    onNext()
  }

  const formatHours = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  return (
    <>
    <DialogBody className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review the detected projects. Select existing clients and projects from the dropdown, or type a new name to create them.
      </p>
      {/* Grouped table */}
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="w-[120px]">Rate (&euro;/h)</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map(([origClient, indices]) => {
              const firstRow = mappings[indices[0]]
              const isSingle = indices.length === 1
              const isExpanded = expandedClients.has(origClient)
              const totalMinutes = indices.reduce((sum, i) => sum + summaries[i].totalMinutes, 0)
              const isGroupModified = indices.some((i) => {
                const m = mappings[i]
                return (
                  m.clientName !== m.originalClientName ||
                  m.clientId !== null ||
                  m.projectName !== m.originalProjectName ||
                  m.projectId !== null
                )
              })

              // Single project — inline row with client + project + rate
              if (isSingle) {
                const i = indices[0]
                const row = mappings[i]
                const summary = summaries[i]
                const isRowModified =
                  row.clientName !== row.originalClientName ||
                  row.clientId !== null ||
                  row.projectName !== row.originalProjectName ||
                  row.projectId !== null

                return (
                  <TableRow key={origClient}>
                    <TableCell>
                      <div className="flex items-center gap-2 pl-8">
                        <ComboboxCell
                          value={row.clientName}
                          selectedId={row.clientId}
                          options={clientOptions}
                          onChange={(name, id) => updateClientForGroup(origClient, name, id)}
                          placeholder="Select or type client"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <ComboboxCell
                        value={row.projectName}
                        selectedId={row.projectId}
                        options={projectOptions}
                        onChange={(name, id) => {
                          const patch: Partial<MappingRowState> = {
                            projectName: name,
                            projectId: id,
                          }
                          if (id) {
                            const p = projects.find((pr) => pr.id === id)
                            if (p) {
                              patch.hourlyRate = p.hourly_rate ?? row.hourlyRate
                              if (p.client) {
                                patch.clientName = p.client.name
                                patch.clientId = p.client.id ?? null
                              }
                            }
                          }
                          updateRow(i, patch)
                        }}
                        placeholder="Select or type project"
                      />
                    </TableCell>
                    <TableCell className="w-[120px]">
                      <EditableCell
                        value={row.hourlyRate != null ? String(row.hourlyRate) : ''}
                        onChange={(v) => {
                          const num = parseFloat(v)
                          updateRow(i, { hourlyRate: isNaN(num) ? null : num })
                        }}
                        placeholder="Set rate"
                        type="number"
                        bordered
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatHours(summary.totalMinutes)}
                    </TableCell>
                    <TableCell className="w-10 px-1">
                      {isRowModified && (
                        <button
                          type="button"
                          title="Revert to original"
                          onClick={() => revertGroup(indices)}
                          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              }

              // Multiple projects — expandable group
              return (
                <React.Fragment key={origClient}>
                  {/* Client group header */}
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => toggleExpanded(origClient)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                          <ChevronRight
                            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                          />
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <ComboboxCell
                            value={firstRow.clientName}
                            selectedId={firstRow.clientId}
                            options={clientOptions}
                            onChange={(name, id) => updateClientForGroup(origClient, name, id)}
                            placeholder="Select or type client"
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground pl-4">
                      {indices.length} projects
                    </TableCell>
                    <TableCell className="w-[120px]" onClick={(e) => e.stopPropagation()}>
                      <EditableCell
                        value=""
                        onChange={(v) => {
                          const num = parseFloat(v)
                          if (!isNaN(num)) {
                            for (const i of indices) {
                              updateRow(i, { hourlyRate: num })
                            }
                          }
                        }}
                        placeholder="Set rate"
                        type="number"
                        bordered
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatHours(totalMinutes)}
                    </TableCell>
                    <TableCell className="w-10 px-1">
                      {isGroupModified && (
                        <button
                          type="button"
                          title="Revert all to original"
                          onClick={(e) => { e.stopPropagation(); revertGroup(indices) }}
                          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Project rows under this client */}
                  {isExpanded &&
                    indices.map((i) => {
                      const row = mappings[i]
                      const summary = summaries[i]
                      const isRowModified =
                        row.projectName !== row.originalProjectName || row.projectId !== null

                      return (
                        <TableRow key={i}>
                          <TableCell />
                          <TableCell>
                            <ComboboxCell
                              value={row.projectName}
                              selectedId={row.projectId}
                              options={projectOptions}
                              onChange={(name, id) => {
                                const patch: Partial<MappingRowState> = {
                                  projectName: name,
                                  projectId: id,
                                }
                                if (id) {
                                  const p = projects.find((pr) => pr.id === id)
                                  if (p) {
                                    patch.hourlyRate = p.hourly_rate ?? row.hourlyRate
                                    if (p.client) {
                                      patch.clientName = p.client.name
                                      patch.clientId = p.client.id ?? null
                                    }
                                  }
                                }
                                updateRow(i, patch)
                              }}
                              placeholder="Select or type project"
                            />
                          </TableCell>
                          <TableCell className="w-[120px]">
                            <EditableCell
                              value={row.hourlyRate != null ? String(row.hourlyRate) : ''}
                              onChange={(v) => {
                                const num = parseFloat(v)
                                updateRow(i, { hourlyRate: isNaN(num) ? null : num })
                              }}
                              placeholder="Set rate"
                              type="number"
                              bordered
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatHours(summary.totalMinutes)}
                          </TableCell>
                          <TableCell className="w-10 px-1">
                            {isRowModified && (
                              <button
                                type="button"
                                title="Revert to original"
                                onClick={() =>
                                  updateRow(i, {
                                    projectName: row.originalProjectName,
                                    projectId: null,
                                    hourlyRate: summaries[i].calculatedRate,
                                  })
                                }
                                className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>

    </DialogBody>
    <DialogFooter className="sm:justify-between">
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext}>
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </DialogFooter>
    </>
  )
}

function autoAssignColor(index: number): string {
  return PROJECT_COLORS[index % PROJECT_COLORS.length]
}

// ---------------------------------------------------------------------------
// Import step
// ---------------------------------------------------------------------------

function ImportStepContent({
  entries,
  summaries,
  mappings,
  onBack,
  onCancel,
  onComplete,
}: {
  entries: ParsedTimeEntry[]
  summaries: ProjectSummary[]
  mappings: MappingRowState[]
  onBack: () => void
  onCancel: () => void
  onComplete?: () => void
}) {
  const { user } = useAuth()
  const { createClient } = useClients()
  const { createProject } = useProjects()
  const [isImporting, setIsImporting] = useState(false)

  // Calculate summary counts
  const totalEntries = entries.length

  // Unique new clients to create (rows where clientId is null, deduplicated by client name)
  const newClientNames = new Set<string>()
  const newProjectCount = mappings.filter((m) => m.projectId === null).length

  for (const m of mappings) {
    if (m.clientId === null && m.clientName) {
      newClientNames.add(m.clientName)
    }
  }
  const newClientCount = newClientNames.size

  const handleImport = async () => {
    if (!user) return
    setIsImporting(true)

    try {
      // Step 1: Create new clients and collect their IDs
      const clientIdByName = new Map<string, string>()

      // Also pre-populate with existing clients from mappings
      for (const m of mappings) {
        if (m.clientId && m.clientName) {
          clientIdByName.set(m.clientName, m.clientId)
        }
      }

      for (const clientName of newClientNames) {
        const { data } = await createClient({
          name: clientName,
          hourly_rate: null,
        })
        if (data) {
          clientIdByName.set(clientName, data.id)
        }
      }

      // Step 2: Create new projects and build project ID map
      // Maps summary index -> project_id
      const projectIdBySummaryIndex = new Map<number, string>()
      let colorIndex = 0

      for (let i = 0; i < mappings.length; i++) {
        const mapping = mappings[i]

        if (mapping.projectId) {
          // Mapped to existing project — use that ID directly
          projectIdBySummaryIndex.set(i, mapping.projectId)
        } else {
          // Create a new project
          const clientId = mapping.clientName
            ? clientIdByName.get(mapping.clientName) ?? null
            : null

          const { data } = await createProject({
            name: mapping.projectName || 'Unnamed project',
            client_id: clientId,
            color: autoAssignColor(colorIndex++),
            hourly_rate: mapping.hourlyRate,
            is_archived: false,
          })
          if (data) {
            projectIdBySummaryIndex.set(i, data.id)
          }
        }
      }

      // Step 3: Build a lookup from ORIGINAL (clientName+projectName) -> summary index
      const summaryIndexByKey = new Map<string, number>()
      for (let i = 0; i < mappings.length; i++) {
        const key = `${mappings[i].originalClientName}\0${mappings[i].originalProjectName}`
        summaryIndexByKey.set(key, i)
      }

      // Step 4: Build time entries with correct project IDs
      const importEntries = entries.map((entry) => {
        const key = `${entry.clientName}\0${entry.projectName}`
        const summaryIdx = summaryIndexByKey.get(key)
        const projectId = summaryIdx !== undefined
          ? projectIdBySummaryIndex.get(summaryIdx) ?? null
          : null

        return {
          project_id: projectId,
          description: entry.description,
          date: entry.date,
          duration_minutes: entry.durationMinutes,
          is_paid: entry.isPaid ?? false,
          is_invoiced: entry.isInvoiced ?? false,
        }
      })

      // Step 5: Bulk import time entries
      if (DEV) {
        devBulkImportTimeEntries(importEntries)
      } else {
        // Supabase bulk insert
        const { error } = await supabase.from('time_entries').insert(
          importEntries.map((e) => ({
            ...e,
            user_id: user.id,
          })),
        )
        if (error) throw error
      }

      toast.success(`Successfully imported ${totalEntries} time entries`)
      onComplete?.()
    } catch (err) {
      console.error('Import failed:', err)
      toast.error('Import failed. Please try again.')
    } finally {
      setIsImporting(false)
    }
  }

  const formatHours = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  // Group summaries by client name
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())

  const clientGroups = React.useMemo(() => {
    const groups = new Map<string, number[]>()
    for (let i = 0; i < mappings.length; i++) {
      const clientKey = mappings[i].clientName || '\u2014'
      if (!groups.has(clientKey)) groups.set(clientKey, [])
      groups.get(clientKey)!.push(i)
    }
    return Array.from(groups.entries())
  }, [mappings])

  const toggleExpanded = (clientKey: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev)
      if (next.has(clientKey)) next.delete(clientKey)
      else next.add(clientKey)
      return next
    })
  }

  return (
    <>
    <DialogBody className="space-y-5 pt-1">
      {/* KPI cards — match Reports page style */}
      <div className="grid shrink-0 grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Time Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-2xl font-normal">{totalEntries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-2xl font-normal">{newClientCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-serif text-2xl font-normal">{newProjectCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Project breakdown table — grouped by client */}
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Entries</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Rate (&euro;/h)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientGroups.map(([clientKey, indices]) => {
              const firstMapping = mappings[indices[0]]
              const isNewClient = firstMapping.clientId === null
              const isExpanded = expandedClients.has(clientKey)
              const totalMinutes = indices.reduce((sum, i) => sum + summaries[i].totalMinutes, 0)
              const totalEntryCount = indices.reduce((sum, i) => sum + summaries[i].entryCount, 0)

              return (
                <React.Fragment key={clientKey}>
                  {/* Client group header */}
                  <TableRow
                    className="bg-muted/20 cursor-pointer"
                    onClick={() => toggleExpanded(clientKey)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                          <ChevronRight
                            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {firstMapping.clientName || '\u2014'}
                        </span>
                        {isNewClient && firstMapping.clientName && (
                          <NewIndicator />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {indices.length} project{indices.length > 1 ? 's' : ''}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{totalEntryCount}</TableCell>
                    <TableCell className="font-mono text-sm">{formatHours(totalMinutes)}</TableCell>
                    <TableCell />
                  </TableRow>

                  {/* Project rows under this client */}
                  {isExpanded &&
                    indices.map((i) => {
                      const mapping = mappings[i]
                      const s = summaries[i]
                      const isNewProject = mapping.projectId === null

                      return (
                        <TableRow key={i}>
                          <TableCell />
                          <TableCell className="text-sm">
                            {isNewProject ? (
                              <span className="flex items-center gap-1.5">
                                <span>{mapping.projectName || 'Unnamed project'}</span>
                                <NewIndicator />
                              </span>
                            ) : (
                              mapping.projectName || 'Unnamed project'
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{s.entryCount}</TableCell>
                          <TableCell className="font-mono text-sm">{formatHours(s.totalMinutes)}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {mapping.hourlyRate != null ? mapping.hourlyRate : <span className="text-muted-foreground">&mdash;</span>}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>

    </DialogBody>
    <DialogFooter className="sm:justify-between">
      <Button variant="outline" onClick={onCancel} disabled={isImporting}>
        Cancel
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onBack} disabled={isImporting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleImport} disabled={isImporting}>
          {isImporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Import {totalEntries} entries
            </>
          )}
        </Button>
      </div>
    </DialogFooter>
    </>
  )
}

// ---------------------------------------------------------------------------
// ImportWizard
// ---------------------------------------------------------------------------

export interface ImportWizardProps {
  /** Called when import completes successfully */
  onComplete?: () => void
  /** Called when user cancels the wizard */
  onCancel?: () => void
  /** Hide the built-in header (title + step indicator) — used when embedded in another wizard */
  hideHeader?: boolean
  /** Called when the internal step changes — used by parent to sync its own stepper */
  onStepChange?: (step: WizardStep) => void
}

export function ImportWizard({ onComplete, onCancel, hideHeader, onStepChange }: ImportWizardProps) {
  const [step, _setStep] = useState<WizardStep>('upload')
  const setStep = useCallback((s: WizardStep) => {
    _setStep(s)
    onStepChange?.(s)
  }, [onStepChange])
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // Parsed data state
  const [csvData, setCsvData] = useState<ParsedCSV | null>(null)
  const [format, setFormat] = useState<DetectedFormat | null>(null)
  const [entries, setEntries] = useState<ParsedTimeEntry[]>([])
  const [summaries, setSummaries] = useState<ProjectSummary[]>([])
  const [fileName, setFileName] = useState<string | null>(null)

  // Mapping state — lifted so ImportStep can access it
  const [mappings, setMappings] = useState<MappingRowState[]>([])

  const { clients } = useClients()
  const { projects } = useProjects()

  const handleUploadSuccess = useCallback(
    (data: {
      csvData: ParsedCSV
      format: DetectedFormat
      entries: ParsedTimeEntry[]
      summaries: ProjectSummary[]
      fileName: string
    }) => {
      setCsvData(data.csvData)
      setFormat(data.format)
      setEntries(data.entries)
      setSummaries(data.summaries)
      setFileName(data.fileName)
      // Initialize mapping state from summaries, auto-matching existing clients/projects
      setMappings(
        data.summaries.map((s) => {
          const matchedClient = s.clientName
            ? clients.find((c) => c.name.toLowerCase() === s.clientName.toLowerCase())
            : null
          const matchedProject = s.projectName
            ? projects.find((p) => p.name.toLowerCase() === s.projectName.toLowerCase())
            : null
          return {
            clientName: matchedClient ? matchedClient.name : s.clientName,
            clientId: matchedClient ? matchedClient.id : null,
            projectName: matchedProject ? matchedProject.name : s.projectName,
            projectId: matchedProject ? matchedProject.id : null,
            hourlyRate: s.calculatedRate,
            originalClientName: s.clientName,
            originalProjectName: s.projectName,
          }
        }),
      )
      setError(null)
      setCompletedSteps((prev) => new Set([...prev, 'upload']))
      setStep('preview')
    },
    [clients, projects],
  )

  return (
    <>
      {!hideHeader && (
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <StepIndicator
            currentStep={step}
            completedSteps={completedSteps}
            onStepClick={(s) => setStep(s)}
          />
        </DialogHeader>
      )}

      {step === 'upload' && (
        <UploadStep
          onParsed={handleUploadSuccess}
          error={error}
          setError={setError}
        />
      )}
      {step === 'preview' && csvData && format && fileName && (
        <PreviewStep
          csvData={csvData}
          format={format}
          entries={entries}
          fileName={fileName}
          onBack={() => setStep('upload')}
          onCancel={() => onCancel?.()}
          onNext={() => {
            setCompletedSteps((prev) => new Set([...prev, 'preview']))
            setStep('mapping')
          }}
        />
      )}
      {step === 'mapping' && (
        <MappingStep
          summaries={summaries}
          mappings={mappings}
          setMappings={setMappings}
          onBack={() => setStep('preview')}
          onCancel={() => onCancel?.()}
          onNext={() => {
            setCompletedSteps((prev) => new Set([...prev, 'mapping']))
            setStep('import')
          }}
          onUpdateSummaries={setSummaries}
        />
      )}
      {step === 'import' && (
        <ImportStepContent
          entries={entries}
          summaries={summaries}
          mappings={mappings}
          onBack={() => setStep('mapping')}
          onCancel={() => onCancel?.()}
          onComplete={onComplete}
        />
      )}
    </>
  )
}
