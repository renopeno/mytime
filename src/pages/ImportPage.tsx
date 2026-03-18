import { useState, useCallback, useRef } from 'react'
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

function PreviewStep() {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      Preview step — coming soon
    </div>
  )
}

function MappingStep() {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      Mapping step — coming soon
    </div>
  )
}

function ImportStep() {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      Import step — coming soon
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
          {step === 'preview' && <PreviewStep />}
          {step === 'mapping' && <MappingStep />}
          {step === 'import' && <ImportStep />}
        </CardContent>
      </Card>
    </div>
  )
}
