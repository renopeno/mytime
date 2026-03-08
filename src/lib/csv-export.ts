import { formatDuration, formatDecimalHours } from '@/lib/duration'
import { formatDate } from '@/lib/format'
import type { TimeEntryWithProject } from '@/types/app.types'

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function exportToCSV(entries: TimeEntryWithProject[], filename = 'time-entries.csv') {
  const headers = ['Date', 'Project', 'Client', 'Description', 'Duration (H:MM)', 'Duration (Decimal)', 'Paid', 'Invoiced']

  const rows = entries.map((entry) => [
    formatDate(entry.date),
    entry.project?.name ?? '',
    entry.project?.client?.name ?? '',
    entry.description,
    formatDuration(entry.duration_minutes),
    formatDecimalHours(entry.duration_minutes),
    entry.is_paid ? 'Yes' : 'No',
    entry.is_invoiced ? 'Yes' : 'No',
  ])

  const csv = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n')

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
