import {
  differenceInDays,
  format,
  startOfWeek,
  getISOWeek,
  startOfMonth,
  parseISO,
} from 'date-fns'
import { hr } from 'date-fns/locale'

export type GroupingMode = 'daily' | 'weekly' | 'monthly'

export interface GroupedDataPoint {
  label: string
  periodStart: Date
  minutes: number
  amount: number
}

interface EntryInput {
  date: string
  durationMinutes: number
  amount: number
}

/**
 * Determine grouping mode based on date range span.
 * - <= 14 days -> 'daily'
 * - 15-90 days -> 'weekly'
 * - > 90 days  -> 'monthly'
 */
export function getGroupingMode(from: Date, to: Date): GroupingMode {
  const days = differenceInDays(to, from)
  if (days <= 35) return 'daily'
  if (days <= 90) return 'weekly'
  return 'monthly'
}

/**
 * Group time entries into buckets based on the given mode.
 * Returns sorted array (ascending by periodStart).
 */
export function groupEntries(
  entries: EntryInput[],
  mode: GroupingMode
): GroupedDataPoint[] {
  const buckets = new Map<string, GroupedDataPoint>()

  for (const entry of entries) {
    const entryDate = parseISO(entry.date)
    let key: string
    let label: string
    let periodStart: Date

    switch (mode) {
      case 'daily': {
        key = entry.date
        periodStart = entryDate
        // e.g. "Pon 01.03."
        label = format(entryDate, 'EEE dd.MM.', { locale: hr })
        // Capitalize first letter
        label = label.charAt(0).toUpperCase() + label.slice(1)
        break
      }
      case 'weekly': {
        periodStart = startOfWeek(entryDate, { weekStartsOn: 1 })
        const week = getISOWeek(entryDate)
        key = `${periodStart.getFullYear()}-W${week}`
        label = `W${week}`
        break
      }
      case 'monthly': {
        periodStart = startOfMonth(entryDate)
        key = format(periodStart, 'yyyy-MM')
        // e.g. "Sij 2026", "Velj 2026"
        label = format(periodStart, 'LLL yyyy', { locale: hr })
        label = label.charAt(0).toUpperCase() + label.slice(1)
        break
      }
    }

    const existing = buckets.get(key)
    if (existing) {
      existing.minutes += entry.durationMinutes
      existing.amount += entry.amount
    } else {
      buckets.set(key, {
        label,
        periodStart,
        minutes: entry.durationMinutes,
        amount: entry.amount,
      })
    }
  }

  return Array.from(buckets.values()).sort(
    (a, b) => a.periodStart.getTime() - b.periodStart.getTime()
  )
}
