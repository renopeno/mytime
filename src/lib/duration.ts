/**
 * Parse a numeric string into minutes.
 * < 100: treat as minutes (15→15, 30→30, 45→45)
 * >= 100: first digits are hours, last two are minutes (130→90, 300→180, 815→495)
 */
export function parseDuration(input: string): number {
  const num = parseInt(input, 10)
  if (isNaN(num) || num < 0) return 0

  if (num < 100) {
    return num // treat as minutes
  }

  const hours = Math.floor(num / 100)
  const minutes = num % 100
  return hours * 60 + minutes
}

/**
 * Format minutes into H:MM display string.
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${m.toString().padStart(2, '0')}`
}

/**
 * Format minutes as decimal hours (e.g., 90 → "1.50").
 */
export function formatDecimalHours(minutes: number): string {
  return (minutes / 60).toFixed(2)
}
