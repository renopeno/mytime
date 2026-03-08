import type { Client, Project, Settings } from '@/types/app.types'

/**
 * Resolves the effective hourly rate for a time entry.
 * Precedence: project.hourly_rate → client.hourly_rate → settings.default_hourly_rate
 */
export function resolveHourlyRate(
  project: Pick<Project, 'hourly_rate'> | null | undefined,
  client: Pick<Client, 'hourly_rate'> | null | undefined,
  settings: Pick<Settings, 'default_hourly_rate'> | null | undefined
): number {
  if (project?.hourly_rate != null) return project.hourly_rate
  if (client?.hourly_rate != null) return client.hourly_rate
  return settings?.default_hourly_rate ?? 0
}
