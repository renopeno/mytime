# MyTimeTracker v1.0 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship MyTimeTracker v1.0 with CSV import, redesigned reporting, production deploy, and mobile-responsive polish.

**Architecture:** Four independent work blocks: (1) Import system — new page with 4-step wizard and CSV parsing lib, (2) Reporting redesign — new date picker component, filters, smart grouping, compare mode, PDF export, (3) Production deploy — Supabase migrations, Vercel config, auth setup, (4) Polish — login page redesign, mobile responsiveness, field cleanup. All new features follow the existing dev-mode pattern (localStorage in dev, Supabase in prod).

**Tech Stack:** React 19 + TypeScript, Vite, Supabase, Tailwind CSS + shadcn/ui, Recharts, @react-pdf/renderer, date-fns, react-hook-form + Zod

---

## Block 1: Import System

### Task 1: CSV Parser Library

**Files:**
- Create: `src/lib/csv-import.ts`
- Create: `src/lib/csv-import.test.ts`

**Step 1: Create CSV parsing and column detection logic**

```ts
// src/lib/csv-import.ts

export interface ParsedCSVRow {
  [key: string]: string
}

export interface ParsedCSV {
  headers: string[]
  rows: ParsedCSVRow[]
}

export interface ColumnMapping {
  date: string | null
  description: string | null
  project: string | null
  client: string | null
  duration: string | null
  tags: string | null
  billableAmount: string | null
  billableRate: string | null
  billable: string | null
}

export interface DetectedFormat {
  name: 'toggl' | 'clockify' | 'harvest' | 'unknown'
  confidence: number
  mapping: ColumnMapping
}

export interface ParsedTimeEntry {
  date: string                // YYYY-MM-DD
  description: string
  projectName: string
  clientName: string
  durationMinutes: number
  isPaid: boolean | null      // null = unknown
  isInvoiced: boolean | null  // null = unknown
  tags: string[]              // leftover tags as #tag
  billableAmount: number | null
  billableRate: number | null
}

export interface ProjectSummary {
  projectName: string
  clientName: string
  totalMinutes: number
  totalAmount: number | null
  calculatedRate: number | null // amount / hours
  entryCount: number
}

// Known billing tag patterns (case-insensitive matching)
const PAID_TAGS = ['paid']
const NOT_PAID_TAGS = ['not paid', 'unpaid', 'not-paid']
const INVOICED_TAGS = ['invoiced', 'invoice sent', 'invoice-sent', 'billed']

// Known column name patterns for auto-detect
const COLUMN_PATTERNS: Record<keyof ColumnMapping, string[]> = {
  date: ['date', 'start date', 'start_date', 'day'],
  description: ['description', 'notes', 'note', 'task description', 'time entry'],
  project: ['project', 'project name'],
  client: ['client', 'client name'],
  duration: ['duration', 'hours', 'time', 'decimal hours', 'duration (decimal)'],
  tags: ['tags', 'tag'],
  billableAmount: ['amount', 'billable amount', 'billable amount (usd)', 'billable amount (eur)', 'earning'],
  billableRate: ['rate', 'billable rate', 'hourly rate'],
  billable: ['billable', 'is billable'],
}

// Format signatures: unique columns that identify a source
const FORMAT_SIGNATURES: Record<string, string[]> = {
  toggl: ['user', 'email', 'start time', 'billable'],
  clockify: ['user', 'email', 'task', 'billable rate', 'billable amount'],
  harvest: ['first name', 'last name', 'task'],
}

/**
 * Parse raw CSV text into headers + rows
 */
export function parseCSVText(text: string): ParsedCSV {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = parseCSVLine(lines[0]).map(h => h.trim())
  const rows: ParsedCSVRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0) continue
    const row: ParsedCSVRow = {}
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || '').trim()
    })
    rows.push(row)
  }

  return { headers, rows }
}

/**
 * Parse a single CSV line respecting quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
  }
  result.push(current)
  return result
}

/**
 * Detect the source format and map columns
 */
export function detectFormat(headers: string[]): DetectedFormat {
  const lower = headers.map(h => h.toLowerCase())

  // Check format signatures
  for (const [format, signature] of Object.entries(FORMAT_SIGNATURES)) {
    const matches = signature.filter(s => lower.includes(s))
    if (matches.length >= 2) {
      return {
        name: format as DetectedFormat['name'],
        confidence: matches.length / signature.length,
        mapping: mapColumns(lower, headers),
      }
    }
  }

  return {
    name: 'unknown',
    confidence: 0,
    mapping: mapColumns(lower, headers),
  }
}

function mapColumns(lowerHeaders: string[], originalHeaders: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    date: null,
    description: null,
    project: null,
    client: null,
    duration: null,
    tags: null,
    billableAmount: null,
    billableRate: null,
    billable: null,
  }

  for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
    for (const pattern of patterns) {
      const idx = lowerHeaders.indexOf(pattern)
      if (idx !== -1) {
        ;(mapping as Record<string, string | null>)[field] = originalHeaders[idx]
        break
      }
    }
  }

  return mapping
}

/**
 * Parse duration string to minutes.
 * Handles: "1:30:00" (H:MM:SS), "1:30" (H:MM), "1.5" (decimal hours), "90" (minutes if <10, hours if has decimal)
 */
export function parseDurationToMinutes(value: string): number {
  if (!value || !value.trim()) return 0
  const v = value.trim()

  // H:MM:SS format
  if (/^\d+:\d{2}:\d{2}$/.test(v)) {
    const [h, m, s] = v.split(':').map(Number)
    return h * 60 + m + Math.round(s / 60)
  }

  // H:MM format
  if (/^\d+:\d{2}$/.test(v)) {
    const [h, m] = v.split(':').map(Number)
    return h * 60 + m
  }

  // Decimal hours (e.g., "1.50", "0.25")
  const num = parseFloat(v)
  if (!isNaN(num)) {
    return Math.round(num * 60)
  }

  return 0
}

/**
 * Classify tags into billing status and leftover tags
 */
export function classifyTags(tagsStr: string): {
  isPaid: boolean | null
  isInvoiced: boolean | null
  remainingTags: string[]
} {
  if (!tagsStr || !tagsStr.trim()) {
    return { isPaid: null, isInvoiced: null, remainingTags: [] }
  }

  const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean)
  const remaining: string[] = []
  let isPaid: boolean | null = null
  let isInvoiced: boolean | null = null

  for (const tag of tags) {
    const lower = tag.toLowerCase()

    if (NOT_PAID_TAGS.includes(lower)) {
      isPaid = false
    } else if (PAID_TAGS.includes(lower)) {
      isPaid = true
    } else if (INVOICED_TAGS.includes(lower)) {
      isInvoiced = true
    } else {
      remaining.push(tag)
    }
  }

  return { isPaid, isInvoiced, remainingTags: remaining }
}

/**
 * Transform parsed CSV rows into our time entry format
 */
export function transformRows(
  rows: ParsedCSVRow[],
  mapping: ColumnMapping
): ParsedTimeEntry[] {
  return rows.map(row => {
    const tagsRaw = mapping.tags ? row[mapping.tags] || '' : ''
    const { isPaid, isInvoiced, remainingTags } = classifyTags(tagsRaw)

    const description = mapping.description ? row[mapping.description] || '' : ''
    const tagSuffix = remainingTags.length > 0
      ? ' ' + remainingTags.map(t => `#${t.replace(/\s+/g, '-')}`).join(' ')
      : ''

    const durationRaw = mapping.duration ? row[mapping.duration] || '' : ''
    const amountRaw = mapping.billableAmount ? row[mapping.billableAmount] || '' : ''
    const rateRaw = mapping.billableRate ? row[mapping.billableRate] || '' : ''

    const amount = amountRaw ? parseFloat(amountRaw.replace(/[^0-9.\-]/g, '')) || null : null
    const rate = rateRaw ? parseFloat(rateRaw.replace(/[^0-9.\-]/g, '')) || null : null

    // Parse date — handle various formats
    let dateStr = mapping.date ? row[mapping.date] || '' : ''
    dateStr = normalizeDate(dateStr)

    return {
      date: dateStr,
      description: (description + tagSuffix).trim(),
      projectName: mapping.project ? row[mapping.project] || '' : '',
      clientName: mapping.client ? row[mapping.client] || '' : '',
      durationMinutes: parseDurationToMinutes(durationRaw),
      isPaid,
      isInvoiced,
      tags: remainingTags,
      billableAmount: amount,
      billableRate: rate,
    }
  }).filter(e => e.durationMinutes > 0) // skip zero-duration entries
}

/**
 * Normalize date string to YYYY-MM-DD
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr) return ''

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr

  // DD/MM/YYYY or DD.MM.YYYY
  const euMatch = dateStr.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/)
  if (euMatch) {
    return `${euMatch[3]}-${euMatch[2].padStart(2, '0')}-${euMatch[1].padStart(2, '0')}`
  }

  // MM/DD/YYYY
  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (usMatch) {
    return `${usMatch[3]}-${usMatch[1].padStart(2, '0')}-${usMatch[2].padStart(2, '0')}`
  }

  // Try Date.parse as fallback
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0]
  }

  return dateStr
}

/**
 * Build project/client summary from parsed entries
 */
export function buildProjectSummaries(entries: ParsedTimeEntry[]): ProjectSummary[] {
  const map = new Map<string, ProjectSummary>()

  for (const entry of entries) {
    const key = `${entry.clientName}|||${entry.projectName}`
    const existing = map.get(key)

    if (existing) {
      existing.totalMinutes += entry.durationMinutes
      existing.entryCount++
      if (entry.billableAmount != null) {
        existing.totalAmount = (existing.totalAmount || 0) + entry.billableAmount
      }
    } else {
      map.set(key, {
        projectName: entry.projectName,
        clientName: entry.clientName,
        totalMinutes: entry.durationMinutes,
        totalAmount: entry.billableAmount,
        entryCount: 1,
        calculatedRate: null,
      })
    }
  }

  // Calculate rates
  for (const summary of map.values()) {
    if (summary.totalAmount != null && summary.totalMinutes > 0) {
      const hours = summary.totalMinutes / 60
      summary.calculatedRate = Math.round((summary.totalAmount / hours) * 100) / 100
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalMinutes - a.totalMinutes)
}
```

**Step 2: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/lib/csv-import.ts
git commit -m "feat: add CSV import parser with auto-detect and tag classification"
```

---

### Task 2: Import Page — Upload Step (Step 1 of wizard)

**Files:**
- Create: `src/pages/ImportPage.tsx`
- Modify: `src/App.tsx` (add route)
- Modify: `src/components/layout/Sidebar.tsx` (add nav item)

**Step 1: Create ImportPage with upload step**

```tsx
// src/pages/ImportPage.tsx

import { useState, useCallback } from 'react'
import { Upload, FileText, ArrowRight, ArrowLeft, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  parseCSVText,
  detectFormat,
  transformRows,
  buildProjectSummaries,
  type ParsedCSV,
  type DetectedFormat,
  type ParsedTimeEntry,
  type ProjectSummary,
} from '@/lib/csv-import'

type WizardStep = 'upload' | 'preview' | 'mapping' | 'import'

export default function ImportPage() {
  const [step, setStep] = useState<WizardStep>('upload')
  const [csvData, setCsvData] = useState<ParsedCSV | null>(null)
  const [format, setFormat] = useState<DetectedFormat | null>(null)
  const [entries, setEntries] = useState<ParsedTimeEntry[]>([])
  const [summaries, setSummaries] = useState<ProjectSummary[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback((file: File) => {
    setError(null)
    if (!file.name.endsWith('.csv')) {
      setError('Molimo uploadajte .csv datoteku')
      return
    }
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const parsed = parseCSVText(text)

        if (parsed.headers.length === 0 || parsed.rows.length === 0) {
          setError('CSV datoteka je prazna ili nema podataka')
          return
        }

        const detected = detectFormat(parsed.headers)
        const transformed = transformRows(parsed.rows, detected.mapping)
        const projectSummaries = buildProjectSummaries(transformed)

        setCsvData(parsed)
        setFormat(detected)
        setEntries(transformed)
        setSummaries(projectSummaries)
        setStep('preview')
      } catch {
        setError('Greška pri parsiranju CSV datoteke')
      }
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import</h1>
        <p className="text-muted-foreground">Uvezi podatke iz drugog alata za praćenje vremena</p>
      </div>

      {/* Wizard steps indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['upload', 'preview', 'mapping', 'import'] as WizardStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-8 bg-border" />}
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              step === s ? 'bg-primary text-primary-foreground' :
              (['upload', 'preview', 'mapping', 'import'].indexOf(step) > i)
                ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {(['upload', 'preview', 'mapping', 'import'].indexOf(step) > i) ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={step === s ? 'font-medium' : 'text-muted-foreground'}>
              {s === 'upload' ? 'Upload' : s === 'preview' ? 'Pregled' : s === 'mapping' ? 'Projekti' : 'Import'}
            </span>
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 'upload' && (
        <Card>
          <CardContent className="p-8">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center transition-colors hover:border-muted-foreground/50"
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">Povuci CSV datoteku ovdje</p>
                <p className="text-sm text-muted-foreground">ili klikni za odabir</p>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
                id="csv-upload"
              />
              <Button variant="outline" asChild>
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <FileText className="mr-2 h-4 w-4" />
                  Odaberi datoteku
                </label>
              </Button>
            </div>
            {error && (
              <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              Podržani formati: Toggl Track, Clockify, Harvest, ili bilo koji CSV s stupcima za datum, projekt, trajanje
            </p>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && (
        <ImportPreviewStep
          csvData={csvData!}
          format={format!}
          entries={entries}
          fileName={fileName}
          onBack={() => setStep('upload')}
          onNext={() => setStep('mapping')}
        />
      )}

      {step === 'mapping' && (
        <ImportMappingStep
          summaries={summaries}
          onBack={() => setStep('preview')}
          onNext={() => setStep('import')}
          onUpdateSummaries={setSummaries}
        />
      )}

      {step === 'import' && (
        <ImportFinalStep
          entries={entries}
          summaries={summaries}
          onBack={() => setStep('mapping')}
        />
      )}
    </div>
  )
}

// Placeholder components — will be implemented in subsequent tasks
function ImportPreviewStep(props: {
  csvData: ParsedCSV; format: DetectedFormat; entries: ParsedTimeEntry[];
  fileName: string; onBack: () => void; onNext: () => void
}) {
  return <div>Preview step — Task 3</div>
}

function ImportMappingStep(props: {
  summaries: ProjectSummary[]; onBack: () => void; onNext: () => void;
  onUpdateSummaries: (s: ProjectSummary[]) => void
}) {
  return <div>Mapping step — Task 4</div>
}

function ImportFinalStep(props: {
  entries: ParsedTimeEntry[]; summaries: ProjectSummary[]; onBack: () => void
}) {
  return <div>Final step — Task 5</div>
}
```

**Step 2: Add route to App.tsx**

In `src/App.tsx`, add lazy import and route:

```tsx
const ImportPage = lazy(() => import('./pages/ImportPage'))
```

Add route inside the protected layout alongside existing routes:
```tsx
<Route path="import" element={<ImportPage />} />
```

**Step 3: Add sidebar nav item**

In `src/components/layout/Sidebar.tsx`, add Import to the navigation (in the Organization group or as its own):

```tsx
{ title: 'Import', url: '/import', icon: Upload }
```

Import `Upload` from `lucide-react`.

**Step 4: Verify build passes and test upload**

Run: `npm run dev` — navigate to `/import`, verify drag & drop zone renders.

**Step 5: Commit**

```bash
git add src/pages/ImportPage.tsx src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: add import page with upload step and wizard skeleton"
```

---

### Task 3: Import Page — Preview Step (Step 2 of wizard)

**Files:**
- Modify: `src/pages/ImportPage.tsx`

**Step 1: Implement ImportPreviewStep component**

Replace the placeholder `ImportPreviewStep` with a real component that shows:
- Detected format badge (e.g., "Toggl Track ✓")
- File name and row count
- Preview table: first 5 rows of parsed data showing mapped columns (Date, Project, Client, Description, Duration, Tags → Status)
- Detected billing tags summary (e.g., "Pronađeni billing tagovi: paid, not paid, invoice sent")

Use `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell` from shadcn, plus `Badge` for format detection and tag indicators.

Include Back and Next buttons in a footer row.

**Step 2: Verify in browser**

Upload a sample CSV, verify preview renders correctly with 5 rows.

**Step 3: Commit**

```bash
git add src/pages/ImportPage.tsx
git commit -m "feat: add import preview step with auto-detect and tag recognition"
```

---

### Task 4: Import Page — Mapping Step (Step 3 of wizard)

**Files:**
- Modify: `src/pages/ImportPage.tsx`

**Step 1: Implement ImportMappingStep component**

Replace placeholder with real component showing a table of unique projects/clients:

| Klijent | Projekt | Satnica | Sati | Zarada | Akcija |
|---------|---------|---------|------|--------|--------|

Features:
- All cells inline-editable on click (use controlled inputs that toggle between display and edit mode)
- Rate auto-calculated where amount data exists, otherwise empty/editable
- Hours displayed as `Xh Ym` format
- Amount displayed with `formatCurrency()`
- Action column: dropdown with "Kreiraj novi" (default) / existing clients+projects from `useClients()` and `useProjects()` hooks
- Back and Next buttons

Use existing `useClients` and `useProjects` hooks to fetch current data for the mapping dropdowns.

**Step 2: Verify in browser**

Upload CSV, go through to mapping step, verify table renders with correct summaries.

**Step 3: Commit**

```bash
git add src/pages/ImportPage.tsx
git commit -m "feat: add import mapping step with inline-editable project/client table"
```

---

### Task 5: Import Page — Final Step + Execute Import

**Files:**
- Modify: `src/pages/ImportPage.tsx`
- Modify: `src/lib/dev-db.ts` (add bulk import function)
- Modify: `src/hooks/useTimeEntries.ts` (add import function)

**Step 1: Add bulk import to dev-db**

Add `devBulkImportTimeEntries` function to `src/lib/dev-db.ts`:

```ts
export function devBulkImportTimeEntries(
  entries: Array<{
    project_id: string | null
    description: string
    date: string
    duration_minutes: number
    is_paid: boolean
    is_invoiced: boolean
  }>
): void {
  const stored = localStorage.getItem('dev_time_entries')
  const existing: TimeEntryRow[] = stored ? JSON.parse(stored) : []
  const now = new Date().toISOString()

  const newEntries: TimeEntryRow[] = entries.map(e => ({
    id: crypto.randomUUID(),
    user_id: 'dev-user-id',
    project_id: e.project_id,
    description: e.description,
    date: e.date,
    duration_minutes: e.duration_minutes,
    is_paid: e.is_paid,
    is_invoiced: e.is_invoiced,
    created_at: now,
    updated_at: now,
  }))

  localStorage.setItem('dev_time_entries', JSON.stringify([...existing, ...newEntries]))
}
```

**Step 2: Add importEntries to useTimeEntries hook**

Add a function that creates clients/projects as needed, then bulk-imports entries. In dev mode use dev-db functions, in prod use Supabase inserts.

**Step 3: Implement ImportFinalStep component**

Replace placeholder with:
- Summary: "X entryja za Y projekata i Z klijenata"
- List of new clients/projects that will be created
- "Import" button that:
  1. Creates new clients (via `useClients().createClient`)
  2. Creates new projects (via `useProjects().createProject`) with auto-assigned colors
  3. Bulk imports all time entries with correct `project_id` references
  4. Shows success toast via `sonner`
  5. Navigates to `/time-entries`

**Step 4: Test full flow**

Create a test CSV file with Toggl-like data, run through all 4 wizard steps, verify entries appear in time entries page.

**Step 5: Commit**

```bash
git add src/pages/ImportPage.tsx src/lib/dev-db.ts src/hooks/useTimeEntries.ts
git commit -m "feat: complete import wizard with bulk import execution"
```

---

## Block 2: Reporting Redesign

### Task 6: Date Range Picker Component

**Files:**
- Create: `src/components/ui/date-range-picker.tsx`

**Step 1: Create DateRangePicker component**

Build a popover component with:
- Left panel: preset list (Today, This Week, Last Week, This Month, Last Month, This Year, Last Year, All Time)
- Right panel: two `Calendar` components side-by-side for custom range
- Props: `value: { from: Date; to: Date }`, `onChange: (range) => void`
- Each preset click immediately calls onChange and closes popover
- Calendar selection: click start date, click end date, calls onChange

Use existing shadcn `Popover`, `Calendar`, `Button` components. Use `date-fns` for preset calculations (`startOfWeek`, `endOfWeek`, `startOfMonth`, etc.).

Trigger button shows current range label (e.g., "This Month" or "Mar 1 – Mar 18, 2026" for custom).

**Step 2: Verify component renders**

Import into ReportsPage temporarily, verify popover opens with presets + dual calendar.

**Step 3: Commit**

```bash
git add src/components/ui/date-range-picker.tsx
git commit -m "feat: add DateRangePicker with presets and dual calendar"
```

---

### Task 7: Smart Grouping Utility

**Files:**
- Create: `src/lib/chart-utils.ts`

**Step 1: Create smart grouping logic**

```ts
// src/lib/chart-utils.ts
import { differenceInDays, format, startOfWeek, getISOWeek } from 'date-fns'
import { hr } from 'date-fns/locale'

export type GroupingMode = 'daily' | 'weekly' | 'monthly'

export interface GroupedDataPoint {
  label: string
  periodStart: Date
  minutes: number
  amount: number
}

/**
 * Determine grouping based on date range span
 */
export function getGroupingMode(from: Date, to: Date): GroupingMode {
  const days = differenceInDays(to, from)
  if (days <= 14) return 'daily'
  if (days <= 90) return 'weekly'
  return 'monthly'
}

/**
 * Group time entries by the appropriate time bucket
 */
export function groupEntries(
  entries: Array<{ date: string; durationMinutes: number; amount: number }>,
  mode: GroupingMode
): GroupedDataPoint[] {
  const buckets = new Map<string, GroupedDataPoint>()

  for (const entry of entries) {
    const date = new Date(entry.date)
    let key: string
    let label: string
    let periodStart: Date

    switch (mode) {
      case 'daily':
        key = entry.date
        label = format(date, 'EEE dd.MM.', { locale: hr })
        periodStart = date
        break
      case 'weekly': {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 })
        key = format(weekStart, 'yyyy-ww')
        label = `W${getISOWeek(date)}`
        periodStart = weekStart
        break
      }
      case 'monthly':
        key = format(date, 'yyyy-MM')
        label = format(date, 'MMM yyyy', { locale: hr })
        periodStart = new Date(date.getFullYear(), date.getMonth(), 1)
        break
    }

    const existing = buckets.get(key)
    if (existing) {
      existing.minutes += entry.durationMinutes
      existing.amount += entry.amount
    } else {
      buckets.set(key, { label, periodStart, minutes: entry.durationMinutes, amount: entry.amount })
    }
  }

  return Array.from(buckets.values()).sort(
    (a, b) => a.periodStart.getTime() - b.periodStart.getTime()
  )
}
```

**Step 2: Commit**

```bash
git add src/lib/chart-utils.ts
git commit -m "feat: add smart grouping utility for report charts"
```

---

### Task 8: Redesign useDashboardData Hook

**Files:**
- Modify: `src/hooks/useDashboardData.ts`

**Step 1: Refactor hook to accept date range and filters**

Update the hook signature from `useDashboardData(period: 'today' | 'week' | 'month')` to:

```ts
interface DashboardFilters {
  from: Date
  to: Date
  projectIds?: string[]
  clientIds?: string[]
  billingStatus?: 'all' | 'not_paid' | 'invoice_sent' | 'paid'
}

interface DashboardData {
  totalMinutes: number
  totalAmount: number
  workingDays: number  // unique dates with entries
  billingBreakdown: {
    notPaid: number    // amount
    invoiceSent: number
    paid: number
  }
  byProject: Array<{ name: string; minutes: number; amount: number; color: string }>
  byClient: Array<{ name: string; minutes: number; amount: number }>
  entries: Array<{ date: string; durationMinutes: number; amount: number; isPaid: boolean; isInvoiced: boolean }>
}
```

Add `workingDays` calculation (count unique dates), `billingBreakdown` (sum amounts by paid/invoiced status), and filter support.

Keep backward compatibility: existing calls should still work or update call sites.

**Step 2: Update dev-db query to support date range filtering**

The existing `devGetTimeEntries` already supports `startDate`/`endDate` — leverage that.

**Step 3: Verify build passes**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/hooks/useDashboardData.ts
git commit -m "refactor: update useDashboardData with date range, filters, billing breakdown"
```

---

### Task 9: Redesign ReportsPage

**Files:**
- Modify: `src/pages/ReportsPage.tsx`

**Step 1: Replace ReportsPage with new design**

Major rewrite:
- Remove tabs (Overview / Time Log)
- Add DateRangePicker at top
- Add filter row: project multi-select, client multi-select, billing status segment control, Compare button
- KPI cards row: Total Hours, Total Earned, Working Days, Billing Breakdown (stacked bar)
- Charts: ByProject|ByClient widget with segment control, Trend widget with Hours|Earnings segment control
- PDF Export button in header
- Use new `useDashboardData` with filters
- Use `getGroupingMode` + `groupEntries` for trend chart data

**Step 2: Implement Compare mode**

When Compare button is clicked, show second DateRangePicker. Fetch second dataset with same filters but compare date range. Show:
- KPI cards with delta (↑12%, ↓5%)
- Trend chart with dashed second line
- Bar chart with grouped bars

**Step 3: Test in browser**

Verify all presets work, filters apply, charts render, compare mode shows deltas.

**Step 4: Commit**

```bash
git add src/pages/ReportsPage.tsx
git commit -m "feat: redesign reports page with date picker, filters, compare mode"
```

---

### Task 10: Report PDF Export

**Files:**
- Modify: `src/lib/pdf-report.tsx`

**Step 1: Update PDF report to match new report layout**

Update `MonthlyReportPDF` → `ReportPDF`:
- Accept date range (not just month)
- Include active filters in header
- Add billing breakdown section
- Add summary by project/client
- Keep detailed entry table
- Add compare data if present (show delta column)

**Step 2: Wire up Export PDF button**

In ReportsPage, the Export PDF button calls the updated PDF generator with current filters and data.

**Step 3: Test PDF generation**

Generate PDF, verify it includes all sections.

**Step 4: Commit**

```bash
git add src/lib/pdf-report.tsx src/pages/ReportsPage.tsx
git commit -m "feat: update PDF export for new report layout with filters and billing"
```

---

## Block 3: Production Deploy

### Task 11: Supabase Migrations

**Files:**
- Create: `supabase/migrations/20260318_add_daily_hours_target.sql`
- Review: `supabase/migrations/20260309_enable_rls.sql`

**Step 1: Create migration for daily_hours_target**

```sql
-- Add daily_hours_target to settings
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS daily_hours_target numeric DEFAULT 8;
```

**Step 2: Review and update RLS policies**

Check `20260309_enable_rls.sql` covers all tables with proper policies:
- Each table: `SELECT/INSERT/UPDATE/DELETE WHERE user_id = auth.uid()`
- Ensure RLS is enabled on all tables

**Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add daily_hours_target migration and verify RLS policies"
```

---

### Task 12: Remove client.address and client.notes

**Files:**
- Modify: `src/types/database.types.ts` — remove address, notes from clients
- Modify: `src/types/app.types.ts` — remove from Client type if present
- Modify: `src/components/clients/ClientForm.tsx` — remove address/notes fields
- Modify: `src/components/clients/ClientList.tsx` — remove address/notes display
- Modify: `src/lib/dev-db.ts` — remove from seed data
- Create: `supabase/migrations/20260318_remove_client_address_notes.sql`

**Step 1: Remove fields from types**

Remove `address` and `notes` from the clients table type in `database.types.ts`.

**Step 2: Remove from ClientForm**

Remove the address `Textarea` and notes `Textarea` fields from the form schema and JSX.

**Step 3: Remove from ClientList**

Remove any display of address/notes in the client list items.

**Step 4: Update dev-db seed data**

Remove `address` and `notes` from seed clients. Bump `DEV_DB_VERSION`.

**Step 5: Create migration**

```sql
ALTER TABLE clients DROP COLUMN IF EXISTS address;
ALTER TABLE clients DROP COLUMN IF EXISTS notes;
```

**Step 6: Verify build passes**

Run: `npx tsc --noEmit`

**Step 7: Commit**

```bash
git add src/types/ src/components/clients/ src/lib/dev-db.ts supabase/migrations/
git commit -m "cleanup: remove client address and notes fields"
```

---

### Task 13: Remove Rounding Mode from Settings UI

**Files:**
- Modify: `src/components/settings/SettingsForm.tsx` — remove rounding_mode if present in UI
- Verify: it's already not in the form (confirmed from exploration — rounding_mode is in types but not in SettingsForm UI)

**Step 1: Verify and clean up**

Check if `rounding_mode` appears in any UI. If it does, remove it. If not (likely), just confirm no action needed.

**Step 2: Commit (only if changes made)**

```bash
git commit -m "cleanup: remove rounding mode from settings UI"
```

---

### Task 14: Vercel + Supabase Production Setup

**Files:**
- Create: `DEPLOY.md` (step-by-step instructions for user)

**Step 1: Write deployment guide**

Create `DEPLOY.md` with detailed instructions:

```markdown
# Production Deployment Guide

## 1. Supabase Setup

### 1.1 Apply Migrations
1. Go to Supabase Dashboard → SQL Editor
2. Run each migration file in order:
   - `supabase/migrations/20260308_add_project_type.sql`
   - `supabase/migrations/20260309_enable_rls.sql`
   - `supabase/migrations/20260318_add_daily_hours_target.sql`
   - `supabase/migrations/20260318_remove_client_address_notes.sql`

### 1.2 Auth Providers

#### Google OAuth
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://<your-supabase-ref>.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret
5. In Supabase Dashboard → Authentication → Providers → Google: paste credentials

#### GitHub OAuth
1. Go to GitHub → Settings → Developer settings → OAuth Apps → New
2. Homepage URL: your app URL
3. Callback URL: `https://<your-supabase-ref>.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret
5. In Supabase Dashboard → Authentication → Providers → GitHub: paste credentials

## 2. Vercel Deploy

1. Push code to GitHub (if not already)
2. Go to vercel.com → New Project → Import your GitHub repo
3. Framework: Vite
4. Environment Variables:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
5. Deploy!

## 3. Post-Deploy Verification
- [ ] Login with Google works
- [ ] Login with GitHub works
- [ ] Login with email/password works
- [ ] Time entries CRUD works
- [ ] Projects CRUD works
- [ ] Clients CRUD works
- [ ] Reports load correctly
- [ ] Import works
```

**Step 2: Commit**

```bash
git add DEPLOY.md
git commit -m "docs: add production deployment guide"
```

---

## Block 4: Polish

### Task 15: Login Page Redesign

**Files:**
- Modify: `src/pages/LoginPage.tsx`

**Step 1: Redesign login page**

Create a visually appealing login page:
- Split layout: left side = branding/illustration area (gradient background, logo, tagline), right side = auth form
- Slightly creative typography for the brand side
- Clean auth form with email/password + OAuth buttons
- Consistent with app's existing design language but slightly bolder
- Mobile: stack vertically (brand on top, form below)

**Step 2: Test both modes (sign in / sign up) and responsive**

Verify desktop split layout and mobile stacked layout both work.

**Step 3: Commit**

```bash
git add src/pages/LoginPage.tsx
git commit -m "feat: redesign login page with split layout and creative branding"
```

---

### Task 16: Mobile Responsive — Sidebar

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/AppLayout.tsx`

**Step 1: Add hamburger menu for mobile**

The existing sidebar uses shadcn's `Sidebar` component which may already support mobile sheet mode. Verify and configure:
- Desktop: normal sidebar (existing behavior)
- Mobile (< 768px): hamburger icon in top bar, sidebar opens as sheet overlay
- Close on navigation

**Step 2: Add consistent page margins**

Ensure all pages have ~20px horizontal padding on mobile. Check `AppLayout.tsx` or add a wrapper class.

**Step 3: Test on mobile viewport**

Use browser DevTools to verify hamburger menu and margins at 375px width.

**Step 4: Commit**

```bash
git add src/components/layout/
git commit -m "feat: add mobile hamburger menu and consistent margins"
```

---

### Task 17: Mobile Responsive — Card Layouts for Tables

**Files:**
- Create: `src/components/ui/responsive-table.tsx` (shared card layout wrapper)
- Modify: `src/pages/TimeEntriesPage.tsx`
- Modify: `src/pages/ProjectsPage.tsx`
- Modify: `src/pages/ClientsPage.tsx`
- Modify: `src/pages/InvoicingPage.tsx`

**Step 1: Create consistent card layout pattern**

Build a responsive wrapper component or establish a pattern:
- Desktop (≥ 768px): existing table layout
- Mobile (< 768px): card layout with consistent positioning:
  - Title/name always at top
  - Key metric (hours, amount) always at top-right
  - Secondary info below
  - Actions at bottom-right

Use the `useMobile` hook (already exists in `src/hooks/use-mobile.ts`) to switch between views.

**Step 2: Apply to TimeEntriesPage**

Convert time entry rows to cards on mobile:
- Project name + date at top
- Description below
- Duration prominent
- Actions (edit, delete, duplicate) in bottom row

**Step 3: Apply to ProjectsPage**

Convert project list to cards on mobile:
- Project name + color dot
- Client name
- Hours logged / estimated
- Archive/delete actions

**Step 4: Apply to ClientsPage**

Convert client list to cards on mobile:
- Client name
- Hourly rate
- Active/inactive badge
- Actions

**Step 5: Apply to InvoicingPage**

Convert invoicing table to cards on mobile:
- Date + project
- Description
- Amount prominent
- Paid/invoiced status badges
- Checkbox for bulk selection

**Step 6: Test consistency across all pages**

Verify at 375px width that all card layouts have consistent spacing, title positions, and action positions.

**Step 7: Commit**

```bash
git add src/components/ src/pages/
git commit -m "feat: add responsive card layouts for all table views on mobile"
```

---

### Task 18: Mobile Responsive — Reports & Import

**Files:**
- Modify: `src/pages/ReportsPage.tsx`
- Modify: `src/pages/ImportPage.tsx`

**Step 1: Reports mobile layout**

- Charts: full-width, stacked vertically
- Date picker: full-width popover, presets on top, single calendar below (not side-by-side on small screens)
- Filter row: wrap to multiple lines
- KPI cards: 2x2 grid instead of 4-column

**Step 2: Import wizard mobile layout**

- Single column layout
- Upload zone: full width
- Preview table: horizontal scroll
- Mapping table: card layout per project (not table)
- Wizard steps: compact (numbers only, no labels)

**Step 3: Test both pages at 375px**

**Step 4: Commit**

```bash
git add src/pages/ReportsPage.tsx src/pages/ImportPage.tsx
git commit -m "feat: mobile responsive reports and import pages"
```

---

### Task 19: Final Integration Test & Cleanup

**Files:**
- Various — fix any issues found

**Step 1: Full app walkthrough**

Test complete flow:
1. Login page renders correctly
2. Time entries page — create, edit, delete, duplicate entries
3. Projects page — create, edit, archive projects
4. Clients page — create, edit clients (no address/notes)
5. Import page — upload CSV, preview, map, import
6. Invoicing page — filter, bulk update paid/invoiced
7. Reports page — all presets, filters, compare, PDF export
8. Settings — update settings
9. Mobile — test all above at 375px width

**Step 2: Fix any issues found**

**Step 3: Verify production build**

Run: `npm run build` — ensure no errors

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: v1.0 final integration fixes and cleanup"
```

---

## Execution Order

Recommended order for maximum parallelism:

```
Block 1 (Import):     Tasks 1 → 2 → 3 → 4 → 5
Block 2 (Reporting):  Tasks 6 → 7 → 8 → 9 → 10
Block 3 (Deploy):     Tasks 11 → 12 → 13 → 14
Block 4 (Polish):     Tasks 15 → 16 → 17 → 18 → 19
```

Blocks 1-3 can run in parallel. Block 4 depends on Blocks 1-2 (for mobile layouts of import + reports pages).

Task 19 (final integration) runs last after everything else is done.
