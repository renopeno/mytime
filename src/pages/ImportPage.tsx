import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
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
// Step definitions
// ---------------------------------------------------------------------------

type WizardStep = 'upload' | 'preview' | 'mapping' | 'import'

const STEPS: { key: WizardStep; label: string; number: number }[] = [
  { key: 'upload', label: 'Upload', number: 1 },
  { key: 'preview', label: 'Preview', number: 2 },
  { key: 'mapping', label: 'Mapping', number: 3 },
  { key: 'import', label: 'Import', number: 4 },
]

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({
  currentStep,
  completedSteps,
}: {
  currentStep: WizardStep
  completedSteps: Set<WizardStep>
}) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep)

  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((step, i) => {
        const isActive = step.key === currentStep
        const isCompleted = completedSteps.has(step.key)
        const isPending = !isActive && !isCompleted

        return (
          <div key={step.key} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-px w-8 sm:w-12 ${
                  i <= currentIndex || isCompleted
                    ? 'bg-primary'
                    : 'bg-muted-foreground/20'
                }`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`hidden text-sm sm:inline ${
                  isPending ? 'text-muted-foreground' : 'font-medium'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
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
    <div className="mx-auto max-w-xl">
      <div className="mb-6 text-center">
        <h2 className="font-serif text-xl font-medium">Upload your CSV</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Import time entries from Toggl, Clockify, Harvest, or any CSV export.
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/20 hover:border-muted-foreground/40'
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Upload className="h-6 w-6 text-muted-foreground" />
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
          onClick={() => inputRef.current?.click()}
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
    </div>
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
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Paid</Badge>
  }
  if (isInvoiced === true) {
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Invoice Sent</Badge>
  }
  if (isPaid === false) {
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Not Paid</Badge>
  }
  return <span className="text-muted-foreground">—</span>
}

function PreviewStep({
  csvData,
  format,
  entries,
  fileName,
  onBack,
  onNext,
}: {
  csvData: ParsedCSV
  format: DetectedFormat
  entries: ParsedTimeEntry[]
  fileName: string
  onBack: () => void
  onNext: () => void
}) {
  const previewEntries = entries.slice(0, 5)
  const isKnownFormat = format.name !== 'unknown'

  // Check if any entries have billing info
  const hasBillingTags = entries.some(
    (e) => e.isPaid !== null || e.isInvoiced !== null,
  )

  return (
    <div className="space-y-6">
      {/* Header with format badge and file info */}
      <div className="text-center">
        <h2 className="font-serif text-xl font-medium">Preview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the parsed data before proceeding.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Badge variant={isKnownFormat ? 'default' : 'secondary'} className="gap-1.5">
          {isKnownFormat ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          {FORMAT_LABELS[format.name]}{isKnownFormat ? ' \u2713' : ''}
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <FileText className="h-3 w-3" />
          {fileName}
        </Badge>
        <Badge variant="outline">
          {csvData.rows.length} {csvData.rows.length === 1 ? 'row' : 'rows'} total
        </Badge>
      </div>

      {/* Preview table */}
      <div className="rounded-lg border">
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
                <TableCell className="font-medium">{entry.date}</TableCell>
                <TableCell>{entry.projectName || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>{entry.clientName || <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="max-w-[200px] truncate" title={entry.description}>
                  {entry.description || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatDuration(entry.durationMinutes)}
                </TableCell>
                <TableCell>
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

      {/* Tag detection summary */}
      {hasBillingTags && (
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">
            Prepoznati billing tagovi: <span className="font-medium text-foreground">paid</span>,{' '}
            <span className="font-medium text-foreground">not paid</span>,{' '}
            <span className="font-medium text-foreground">invoice sent</span>{' '}
            &rarr; automatski mapirani na status
          </span>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext}>
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mapping row state
// ---------------------------------------------------------------------------

type MappingAction = 'create_new' | string // string = existing project ID

interface MappingRowState {
  action: MappingAction
  clientName: string
  projectName: string
  hourlyRate: number | null
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
}: {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  type?: 'text' | 'number'
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

  if (isEditing) {
    return (
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
        className="h-7 w-full min-w-[80px] text-sm"
        placeholder={placeholder}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={`inline-block w-full cursor-text rounded px-1.5 py-0.5 text-left text-sm hover:bg-muted/60 ${className}`}
      title="Click to edit"
    >
      {value || <span className="text-muted-foreground">{placeholder || '—'}</span>}
    </button>
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
  onNext,
  onUpdateSummaries,
}: {
  summaries: ProjectSummary[]
  mappings: MappingRowState[]
  setMappings: React.Dispatch<React.SetStateAction<MappingRowState[]>>
  onBack: () => void
  onNext: () => void
  onUpdateSummaries: (summaries: ProjectSummary[]) => void
}) {
  const { projects } = useProjects()

  const updateRow = (index: number, patch: Partial<MappingRowState>) => {
    setMappings((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const handleActionChange = (index: number, value: string) => {
    if (value === 'create_new') {
      // Reset to original summary names
      updateRow(index, {
        action: 'create_new',
        clientName: summaries[index].clientName,
        projectName: summaries[index].projectName,
      })
    } else {
      // Map to existing project
      const existingProject = projects.find((p) => p.id === value)
      if (existingProject) {
        updateRow(index, {
          action: value,
          clientName: existingProject.client?.name ?? '',
          projectName: existingProject.name,
          hourlyRate: existingProject.hourly_rate ?? mappings[index].hourlyRate,
        })
      }
    }
  }

  const handleNext = () => {
    // Sync mapping edits back into summaries
    const updated = summaries.map((s, i) => ({
      ...s,
      clientName: mappings[i].clientName,
      projectName: mappings[i].projectName,
      calculatedRate: mappings[i].hourlyRate,
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
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-serif text-xl font-medium">Map Projects &amp; Clients</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review detected projects. Rename, set rates, or map to existing projects.
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.map((row, i) => {
              const summary = summaries[i]
              const isMapped = row.action !== 'create_new'

              return (
                <TableRow key={i}>
                  <TableCell>
                    {isMapped ? (
                      <span className="text-sm text-muted-foreground">{row.clientName || '—'}</span>
                    ) : (
                      <EditableCell
                        value={row.clientName}
                        onChange={(v) => updateRow(i, { clientName: v })}
                        placeholder="No client"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {isMapped ? (
                      <span className="text-sm">{row.projectName}</span>
                    ) : (
                      <EditableCell
                        value={row.projectName}
                        onChange={(v) => updateRow(i, { projectName: v })}
                        placeholder="Unnamed project"
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <EditableCell
                      value={row.hourlyRate != null ? String(row.hourlyRate) : ''}
                      onChange={(v) => {
                        const num = parseFloat(v)
                        updateRow(i, { hourlyRate: isNaN(num) ? null : num })
                      }}
                      placeholder="—"
                      type="number"
                      className="text-right"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatHours(summary.totalMinutes)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {summary.totalAmount != null
                      ? formatCurrency(summary.totalAmount)
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.action}
                      onValueChange={(v) => handleActionChange(i, v)}
                    >
                      <SelectTrigger className="h-8 w-[180px] text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="create_new">Create new</SelectItem>
                        {projects.length > 0 && (
                          <>
                            {projects.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}{p.client ? ` (${p.client.name})` : ''}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-muted-foreground">
          Click on client name, project name, or rate to edit inline.
          Use the Action dropdown to map to an existing project instead of creating a new one.
        </span>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext}>
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

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

function autoAssignColor(index: number): string {
  return PROJECT_COLORS[index % PROJECT_COLORS.length]
}

// ---------------------------------------------------------------------------
// Import step
// ---------------------------------------------------------------------------

function ImportStep({
  entries,
  summaries,
  mappings,
  onBack,
}: {
  entries: ParsedTimeEntry[]
  summaries: ProjectSummary[]
  mappings: MappingRowState[]
  onBack: () => void
}) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { createClient } = useClients()
  const { createProject } = useProjects()
  const [isImporting, setIsImporting] = useState(false)

  // Calculate summary counts
  const totalEntries = entries.length

  // Unique new clients to create (from rows where action = create_new, deduplicated by client name)
  const newClientNames = new Set<string>()
  const newProjectCount = mappings.filter((m) => m.action === 'create_new').length

  for (const m of mappings) {
    if (m.action === 'create_new' && m.clientName) {
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

        if (mapping.action === 'create_new') {
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
        } else {
          // Mapped to existing project
          projectIdBySummaryIndex.set(i, mapping.action)
        }
      }

      // Step 3: Build a lookup from (clientName+projectName) -> summary index
      const summaryIndexByKey = new Map<string, number>()
      for (let i = 0; i < summaries.length; i++) {
        const key = `${summaries[i].clientName}\0${summaries[i].projectName}`
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
      navigate('/time-entries')
    } catch (err) {
      console.error('Import failed:', err)
      toast.error('Import failed. Please try again.')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-serif text-xl font-medium">Import Summary</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and confirm the import.
        </p>
      </div>

      <div className="mx-auto max-w-md space-y-3">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <span className="text-sm text-muted-foreground">Time entries to import</span>
          <span className="text-lg font-semibold">{totalEntries}</span>
        </div>
        {newClientCount > 0 && (
          <div className="flex items-center justify-between rounded-lg border p-4">
            <span className="text-sm text-muted-foreground">New clients to create</span>
            <span className="text-lg font-semibold">{newClientCount}</span>
          </div>
        )}
        {newProjectCount > 0 && (
          <div className="flex items-center justify-between rounded-lg border p-4">
            <span className="text-sm text-muted-foreground">New projects to create</span>
            <span className="text-lg font-semibold">{newProjectCount}</span>
          </div>
        )}

        {/* Breakdown by project */}
        <div className="rounded-lg border">
          <div className="border-b px-4 py-2">
            <span className="text-sm font-medium">Project breakdown</span>
          </div>
          <div className="divide-y">
            {summaries.map((s, i) => {
              const mapping = mappings[i]
              const isExisting = mapping.action !== 'create_new'
              return (
                <div key={i} className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{mapping.projectName || 'Unnamed project'}</span>
                    {mapping.clientName && (
                      <span className="text-xs text-muted-foreground">({mapping.clientName})</span>
                    )}
                    <Badge variant={isExisting ? 'secondary' : 'outline'} className="text-xs">
                      {isExisting ? 'Existing' : 'New'}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {s.entryCount} {s.entryCount === 1 ? 'entry' : 'entries'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
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
    </div>
  )
}

// ---------------------------------------------------------------------------
// ImportPage
// ---------------------------------------------------------------------------

export default function ImportPage() {
  const [step, setStep] = useState<WizardStep>('upload')
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
      // Initialize mapping state from summaries
      setMappings(
        data.summaries.map((s) => ({
          action: 'create_new',
          clientName: s.clientName,
          projectName: s.projectName,
          hourlyRate: s.calculatedRate,
        })),
      )
      setError(null)
      setCompletedSteps((prev) => new Set([...prev, 'upload']))
      setStep('preview')
    },
    [],
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Import</h1>
          <p className="text-sm text-muted-foreground">
            Import time entries from a CSV file
          </p>
        </div>
        {fileName && (
          <Badge variant="secondary" className="gap-1.5">
            <FileText className="h-3 w-3" />
            {fileName}
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-8">
            <StepIndicator currentStep={step} completedSteps={completedSteps} />
          </div>

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
              onNext={() => {
                setCompletedSteps((prev) => new Set([...prev, 'mapping']))
                setStep('import')
              }}
              onUpdateSummaries={setSummaries}
            />
          )}
          {step === 'import' && (
            <ImportStep
              entries={entries}
              summaries={summaries}
              mappings={mappings}
              onBack={() => setStep('mapping')}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
