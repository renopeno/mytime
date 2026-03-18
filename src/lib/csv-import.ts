// ---------------------------------------------------------------------------
// CSV Import — parsing, format detection, and transformation utilities
// ---------------------------------------------------------------------------

// ---- Types ----------------------------------------------------------------

export type ParsedCSVRow = { [key: string]: string }

export type ParsedCSV = {
  headers: string[]
  rows: ParsedCSVRow[]
}

export type ColumnMapping = {
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

export type DetectedFormat = {
  name: 'toggl' | 'clockify' | 'harvest' | 'unknown'
  confidence: number
  mapping: ColumnMapping
}

export type ParsedTimeEntry = {
  date: string // YYYY-MM-DD
  description: string
  projectName: string
  clientName: string
  durationMinutes: number
  isPaid: boolean | null
  isInvoiced: boolean | null
  tags: string[]
  billableAmount: number | null
  billableRate: number | null
}

export type ProjectSummary = {
  projectName: string
  clientName: string
  totalMinutes: number
  totalAmount: number | null
  calculatedRate: number | null
  entryCount: number
}

// ---- Helpers --------------------------------------------------------------

/** Lowercase & trim for header comparison */
function norm(s: string): string {
  return s.toLowerCase().trim()
}

// ---- 1. parseCSVText ------------------------------------------------------

/**
 * Parse raw CSV text into headers + rows.
 * Handles quoted fields with commas and escaped quotes ("").
 */
export function parseCSVText(text: string): ParsedCSV {
  const lines = splitCSVLines(text)
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = parseCSVLine(lines[0])
  const rows: ParsedCSVRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue
    const row: ParsedCSVRow = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? ''
    }
    rows.push(row)
  }

  return { headers, rows }
}

/** Split CSV text into logical lines (respecting quoted fields that span lines). */
function splitCSVLines(text: string): string[] {
  const lines: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      current += ch
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      // Handle \r\n
      if (ch === '\r' && text[i + 1] === '\n') i++
      if (current.trim() !== '') lines.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim() !== '') lines.push(current)
  return lines
}

/** Parse a single CSV line into an array of field values. */
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let i = 0
  while (i <= line.length) {
    if (i === line.length) {
      fields.push('')
      break
    }
    if (line[i] === '"') {
      // Quoted field
      let value = ''
      i++ // skip opening quote
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            value += '"'
            i += 2
          } else {
            i++ // skip closing quote
            break
          }
        } else {
          value += line[i]
          i++
        }
      }
      fields.push(value)
      // Skip comma after quoted field
      if (line[i] === ',') i++
    } else {
      // Unquoted field
      const next = line.indexOf(',', i)
      if (next === -1) {
        fields.push(line.slice(i))
        break
      } else {
        fields.push(line.slice(i, next))
        i = next + 1
      }
    }
  }
  return fields
}

// ---- 2. detectFormat ------------------------------------------------------

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

/**
 * Auto-detect which time-tracking tool produced the CSV and build a column mapping.
 */
export function detectFormat(headers: string[]): DetectedFormat {
  const lower = headers.map(norm)

  // Build mapping first (shared across all formats)
  const mapping = buildMapping(lower, headers)

  // Detect format by signature headers
  const togglSigs = ['user', 'email', 'start time', 'billable']
  const clockifySigs = ['user', 'email', 'task', 'billable rate', 'billable amount']
  const harvestSigs = ['first name', 'last name', 'task']

  const togglScore = countMatches(lower, togglSigs)
  const clockifyScore = countMatches(lower, clockifySigs)
  const harvestScore = countMatches(lower, harvestSigs)

  const maxScore = Math.max(togglScore, clockifyScore, harvestScore)

  if (maxScore === 0) {
    return { name: 'unknown', confidence: 0, mapping }
  }

  if (togglScore >= clockifyScore && togglScore >= harvestScore) {
    return { name: 'toggl', confidence: togglScore / togglSigs.length, mapping }
  }
  if (clockifyScore >= harvestScore) {
    return { name: 'clockify', confidence: clockifyScore / clockifySigs.length, mapping }
  }
  return { name: 'harvest', confidence: harvestScore / harvestSigs.length, mapping }
}

function countMatches(lowerHeaders: string[], signatures: string[]): number {
  return signatures.filter((sig) => lowerHeaders.includes(sig)).length
}

function buildMapping(lowerHeaders: string[], originalHeaders: string[]): ColumnMapping {
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

  for (const field of Object.keys(COLUMN_PATTERNS) as (keyof ColumnMapping)[]) {
    for (const pattern of COLUMN_PATTERNS[field]) {
      const idx = lowerHeaders.indexOf(pattern)
      if (idx !== -1) {
        mapping[field] = originalHeaders[idx]
        break
      }
    }
  }

  return mapping
}

// ---- 3. parseDurationToMinutes --------------------------------------------

/**
 * Parse a duration string into minutes.
 * Handles: "1:30:00" (H:MM:SS), "1:30" (H:MM), "1.5" (decimal hours), plain numbers.
 */
export function parseDurationToMinutes(value: string): number {
  const trimmed = value.trim()
  if (trimmed === '') return 0

  // H:MM:SS
  const hmsMatch = trimmed.match(/^(\d+):(\d{1,2}):(\d{1,2})$/)
  if (hmsMatch) {
    const h = parseInt(hmsMatch[1], 10)
    const m = parseInt(hmsMatch[2], 10)
    const s = parseInt(hmsMatch[3], 10)
    return h * 60 + m + Math.round(s / 60)
  }

  // H:MM
  const hmMatch = trimmed.match(/^(\d+):(\d{1,2})$/)
  if (hmMatch) {
    const h = parseInt(hmMatch[1], 10)
    const m = parseInt(hmMatch[2], 10)
    return h * 60 + m
  }

  // Decimal hours or plain number
  const num = parseFloat(trimmed)
  if (!isNaN(num)) {
    return Math.round(num * 60)
  }

  return 0
}

// ---- 4. classifyTags ------------------------------------------------------

/**
 * Parse a tags string and classify billing-related tags.
 */
export function classifyTags(tagsStr: string): {
  isPaid: boolean | null
  isInvoiced: boolean | null
  remainingTags: string[]
} {
  let isPaid: boolean | null = null
  let isInvoiced: boolean | null = null
  const remainingTags: string[] = []

  if (!tagsStr || tagsStr.trim() === '') {
    return { isPaid, isInvoiced, remainingTags }
  }

  const tags = tagsStr.split(',').map((t) => t.trim()).filter(Boolean)

  for (const tag of tags) {
    const lower = tag.toLowerCase()
    if (lower === 'paid') {
      isPaid = true
    } else if (lower === 'not paid' || lower === 'unpaid' || lower === 'not-paid') {
      isPaid = false
    } else if (
      lower === 'invoiced' ||
      lower === 'invoice sent' ||
      lower === 'invoice-sent' ||
      lower === 'billed'
    ) {
      isInvoiced = true
    } else {
      remainingTags.push(tag)
    }
  }

  return { isPaid, isInvoiced, remainingTags }
}

// ---- 5. transformRows -----------------------------------------------------

/**
 * Transform raw CSV rows into normalized ParsedTimeEntry objects.
 * Filters out zero-duration entries. Appends remaining tags as #tag to description.
 */
export function transformRows(
  rows: ParsedCSVRow[],
  mapping: ColumnMapping,
): ParsedTimeEntry[] {
  const entries: ParsedTimeEntry[] = []

  for (const row of rows) {
    const rawDuration = mapping.duration ? row[mapping.duration] ?? '' : ''
    const durationMinutes = parseDurationToMinutes(rawDuration)
    if (durationMinutes <= 0) continue

    const rawDate = mapping.date ? row[mapping.date] ?? '' : ''
    const date = normalizeDate(rawDate)

    const rawDescription = mapping.description ? row[mapping.description] ?? '' : ''
    const projectName = mapping.project ? (row[mapping.project] ?? '').trim() : ''
    const clientName = mapping.client ? (row[mapping.client] ?? '').trim() : ''

    const rawTags = mapping.tags ? row[mapping.tags] ?? '' : ''
    const { isPaid, isInvoiced, remainingTags } = classifyTags(rawTags)

    // Append remaining tags to description
    let description = rawDescription.trim()
    if (remainingTags.length > 0) {
      const tagSuffix = remainingTags.map((t) => `#${t.replace(/\s+/g, '-')}`).join(' ')
      description = description ? `${description} ${tagSuffix}` : tagSuffix
    }

    const rawAmount = mapping.billableAmount ? row[mapping.billableAmount] ?? '' : ''
    const rawRate = mapping.billableRate ? row[mapping.billableRate] ?? '' : ''

    const billableAmount = parseOptionalNumber(rawAmount)
    const billableRate = parseOptionalNumber(rawRate)

    entries.push({
      date,
      description,
      projectName,
      clientName,
      durationMinutes,
      isPaid,
      isInvoiced,
      tags: remainingTags,
      billableAmount,
      billableRate,
    })
  }

  return entries
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const num = parseFloat(trimmed)
  return isNaN(num) ? null : num
}

/**
 * Normalize a date string to YYYY-MM-DD.
 * Handles: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD.MM.YYYY, DD-MM-YYYY, ISO strings.
 */
function normalizeDate(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  // Already YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
  }

  // DD/MM/YYYY or MM/DD/YYYY or DD.MM.YYYY or DD-MM-YYYY
  const sepMatch = trimmed.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})/)
  if (sepMatch) {
    const a = parseInt(sepMatch[1], 10)
    const b = parseInt(sepMatch[2], 10)
    const year = sepMatch[3]

    // If first number > 12, it must be day (DD/MM/YYYY)
    if (a > 12) {
      return `${year}-${pad2(b)}-${pad2(a)}`
    }
    // If second number > 12, it must be day (MM/DD/YYYY)
    if (b > 12) {
      return `${year}-${pad2(a)}-${pad2(b)}`
    }
    // Ambiguous — assume MM/DD/YYYY (US format, common in exports)
    return `${year}-${pad2(a)}-${pad2(b)}`
  }

  // Try Date.parse as fallback for ISO or other formats
  const parsed = Date.parse(trimmed)
  if (!isNaN(parsed)) {
    const d = new Date(parsed)
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  }

  return trimmed
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

// ---- 6. buildProjectSummaries ---------------------------------------------

/**
 * Group entries by client+project, calculate totals, sort by totalMinutes descending.
 */
export function buildProjectSummaries(entries: ParsedTimeEntry[]): ProjectSummary[] {
  const map = new Map<string, ProjectSummary>()

  for (const entry of entries) {
    const key = `${entry.clientName}\0${entry.projectName}`
    let summary = map.get(key)
    if (!summary) {
      summary = {
        projectName: entry.projectName,
        clientName: entry.clientName,
        totalMinutes: 0,
        totalAmount: null,
        calculatedRate: null,
        entryCount: 0,
      }
      map.set(key, summary)
    }
    summary.totalMinutes += entry.durationMinutes
    summary.entryCount++
    if (entry.billableAmount != null) {
      summary.totalAmount = (summary.totalAmount ?? 0) + entry.billableAmount
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
